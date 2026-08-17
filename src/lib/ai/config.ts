import { z } from "zod";

/**
 * All AI configuration in one place, validated once.
 *
 * Every knob has a working default, so the only variable that is genuinely
 * required is GEMINI_API_KEY. Nothing here reads a NEXT_PUBLIC_ variable and
 * nothing here is imported by a client component — this module is server-only.
 */

/** Coerce a numeric env var, falling back when unset or unparseable. */
const numeric = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).catch(fallback);

const schema = z.object({
  /**
   * Chat model. Defaults to a current-generation Flash-Lite: it has a free
   * tier, supports tool calling and streaming, and is the cheapest current
   * model if usage ever exceeds free limits.
   *
   * Raise to `gemini-3.7-flash` for stronger reasoning on architecture
   * questions — also free-tier, at a higher paid rate.
   */
  model: z.string().min(1).catch("gemini-3.5-flash-lite"),

  /**
   * Embedding model. gemini-embedding-001 has a free tier and accepts a
   * task_type hint, which measurably improves retrieval over symmetric
   * embeddings.
   */
  embeddingModel: z.string().min(1).catch("gemini-embedding-001"),

  /**
   * Output dimensions. The model emits 3072 natively and supports truncation
   * to 1536 or 768. 768 is the default here: with a corpus of a few dozen
   * chunks it retrieves just as well, and it keeps the table small enough to
   * sit comfortably inside a free Postgres tier.
   */
  embeddingDimensions: z.union([
    z.literal(768),
    z.literal(1536),
    z.literal(3072),
  ]).catch(768),

  /** Chunks retrieved per question. */
  ragTopK: numeric(5, 1, 20),

  /**
   * Minimum cosine similarity for a chunk to count as relevant. Below this a
   * chunk is dropped rather than cited, which stops the UI attributing an
   * answer to content that merely shares vocabulary.
   *
   * 0.66 is measured, not guessed. Against this corpus and embedding model, nine
   * probe queries put correct answers in 0.664-0.734 and the best *off-topic*
   * match in 0.466-0.633 — a clean gap, and 0.66 sits inside it. The earlier
   * 0.5 default admitted almost everything: a question about contact details
   * came back citing an unrelated project. Re-measure with
   * `RAG_MIN_SCORE` if the content or the embedding model changes materially.
   */
  ragMinScore: z.coerce.number().min(0).max(1).catch(0.66),

  /** Requests allowed per window, per IP. */
  rateLimit: numeric(10, 1, 1000),
  /** Rate limit window, in seconds. */
  rateWindowSeconds: numeric(60, 1, 86_400),

  /** Cached answer lifetime, in seconds. 0 disables the cache. */
  cacheTtlSeconds: numeric(3600, 0, 86_400),

  /** Upper bound on a single user message. */
  maxMessageLength: numeric(2000, 1, 8000),
  /** Turns of history accepted from the client. */
  maxHistory: numeric(20, 1, 100),

  /** Ceiling on how long we wait for the model before aborting. */
  upstreamTimeoutMs: numeric(30_000, 1000, 120_000),
});

export type AiConfig = z.infer<typeof schema>;

let cached: AiConfig | null = null;

export function getAiConfig(): AiConfig {
  cached ??= schema.parse({
    model: process.env.AI_MODEL,
    embeddingModel: process.env.AI_EMBEDDING_MODEL,
    embeddingDimensions: process.env.AI_EMBEDDING_DIMENSIONS,
    ragTopK: process.env.RAG_TOP_K,
    ragMinScore: process.env.RAG_MIN_SCORE,
    rateLimit: process.env.AI_RATE_LIMIT,
    rateWindowSeconds: process.env.AI_RATE_WINDOW,
    cacheTtlSeconds: process.env.AI_CACHE_TTL,
    maxMessageLength: process.env.AI_MAX_MESSAGE_LENGTH,
    maxHistory: process.env.AI_MAX_HISTORY,
    upstreamTimeoutMs: process.env.AI_TIMEOUT_MS,
  });
  return cached;
}

/** True when a vector store is configured. Retrieval is skipped when false. */
export function hasVectorStore(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
