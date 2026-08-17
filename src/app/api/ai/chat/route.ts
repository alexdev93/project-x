import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiConfig } from "@/lib/ai/config";
import { runAgent } from "@/lib/ai/agent/agent";
import { SOURCES_SENTINEL } from "@/lib/ai/agent/types";
import { cacheKey, getCached, setCached } from "@/lib/cache/ai-cache";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Never cached at the edge: each request is a distinct conversation and costs a
// model call. Caching happens in-process, keyed on the normalised question.
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat
 *
 * Streams `text/plain`. The body is answer text, followed by a single sentinel
 * line carrying citations — sources are only known after the tools have run, so
 * they cannot go in a header.
 *
 * Order matters: rate limit, then validate, then cache, then the model. The
 * cheapest rejection runs first, and a cache hit never reaches Gemini.
 */

function buildSchema() {
  const { maxMessageLength, maxHistory } = getAiConfig();
  return z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(maxMessageLength),
        }),
      )
      .min(1)
      .max(maxHistory),
  });
}

function fail(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

/** Text stream headers. Buffering must be off or streaming is pointless. */
const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
} as const;

function sourcesTail(sources: unknown[]): string {
  return sources.length
    ? `${SOURCES_SENTINEL}${JSON.stringify({ sources })}`
    : "";
}

export async function POST(request: Request) {
  const config = getAiConfig();

  const limit = rateLimit(clientKey(request, "ai-chat"), {
    limit: config.rateLimit,
    windowMs: config.rateWindowSeconds * 1000,
  });
  if (!limit.allowed) {
    return fail(
      "You've reached the message limit for now. Try again shortly.",
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  // Reject oversized bodies before parsing them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  const ceiling = config.maxMessageLength * config.maxHistory * 2;
  if (declared > ceiling) return fail("Request too large.", 413);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const parsed = buildSchema().safeParse(payload);
  if (!parsed.success) {
    return fail("That message couldn't be read. Please try again.", 400);
  }
  const { messages } = parsed.data;

  // --- cache -------------------------------------------------------------
  const key = cacheKey(messages);
  if (key) {
    const hit = getCached(key);
    if (hit) {
      return new Response(hit.text + sourcesTail(hit.sources), {
        headers: { ...STREAM_HEADERS, "X-Cache": "HIT" },
      });
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("AI chat: GEMINI_API_KEY is not configured.");
    return fail(
      "The assistant isn't configured yet. Please use the contact form.",
      503,
    );
  }

  // --- model -------------------------------------------------------------
  let run;
  try {
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(config.upstreamTimeoutMs),
    ]);
    run = runAgent({ messages, signal });
  } catch (error) {
    console.error("AI chat: failed to start agent.", error);
    return fail("The assistant couldn't answer that. Please try again.", 502);
  }

  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of run.stream) {
          answer += delta;
          controller.enqueue(encoder.encode(delta));
        }

        // Citations are appended once, after the answer, because the tools that
        // produce them may run at any point during generation.
        const tail = sourcesTail(run.sources);
        if (tail) controller.enqueue(encoder.encode(tail));

        if (key) setCached(key, { text: answer, sources: run.sources });
        controller.close();
      } catch (error) {
        console.error("AI chat: stream failed.", error);

        // The user may already be reading a partial answer, so the connection
        // cannot carry an error status. Close cleanly and let the client show
        // what arrived; a truncated reply beats a reply that vanishes.
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },

    cancel() {
      // Client navigated away or pressed stop; nothing to clean up beyond
      // letting the abort signal propagate.
    },
  });

  return new Response(stream, {
    headers: { ...STREAM_HEADERS, "X-Cache": "MISS" },
  });
}
