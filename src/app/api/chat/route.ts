import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getChatProvider,
  getSystemPrompt,
  ProviderNotConfiguredError,
} from "@/lib/ai";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Never cached: every request is a distinct conversation and costs a model call.
export const dynamic = "force-dynamic";

/** Caps chosen to bound token spend per request, not to constrain real use. */
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

/**
 * Ceiling on how long we wait for the model. Without it, an upstream that
 * accepts the connection and then stalls would hold the request open until the
 * platform's own timeout, with the user watching an idle typing indicator.
 */
const UPSTREAM_TIMEOUT_MS = 30_000;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
      }),
    )
    .min(1)
    .max(MAX_HISTORY),
});

const RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };

function errorResponse(message: string, status: number, extra?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers: extra });
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "chat"), RATE_LIMIT);
  if (!limit.allowed) {
    return errorResponse(
      "You've reached the message limit for now. Try again in a little while.",
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse("That message couldn't be read. Please try again.", 400);
  }

  let provider;
  try {
    provider = getChatProvider();
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      // Logged server-side with the specific variable; the client is told only
      // that the feature is unavailable.
      console.error(error.message);
      return errorResponse(
        "The assistant isn't configured yet. Please use the contact form.",
        503,
      );
    }
    throw error;
  }

  try {
    // AbortSignal.any composes the two ways this call should end early: the
    // client navigating away, and the model taking too long. Whichever fires
    // first aborts the upstream request.
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    ]);

    const textStream = provider.streamReply({
      system: getSystemPrompt(),
      messages: parsed.data.messages,
      signal,
    });

    return new Response(textStream.pipeThrough(new TextEncoderStream()), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Stops proxies buffering the stream, which would defeat streaming.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chat request failed.", error);
    return errorResponse(
      "The assistant couldn't answer that. Please try again.",
      502,
    );
  }
}
