import type { Source } from "@/lib/rag/types";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/**
 * The streaming wire format.
 *
 * The body is plain answer text, then a single trailing line carrying the
 * citations:
 *
 *   Alex works mainly in Java…
 *   \n__SOURCES__{"sources":[…]}
 *
 * Sources are only known once the tools have run, so they cannot be sent in a
 * header before the stream opens. A sentinel line keeps the transport a simple
 * text stream — no SSE framing to parse, and a client that ignores the sentinel
 * still renders a correct answer.
 */
export const SOURCES_SENTINEL = "\n__SOURCES__";

export type SourcesPayload = { sources: Source[] };

/** Splits a completed stream body into answer text and citations. */
export function parseSources(body: string): {
  text: string;
  sources: Source[];
} {
  const index = body.lastIndexOf(SOURCES_SENTINEL);
  if (index === -1) return { text: body, sources: [] };

  const text = body.slice(0, index);
  const raw = body.slice(index + SOURCES_SENTINEL.length);

  try {
    const parsed = JSON.parse(raw) as SourcesPayload;
    return {
      text,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  } catch {
    // A truncated tail must not lose the answer the user already read.
    return { text, sources: [] };
  }
}
