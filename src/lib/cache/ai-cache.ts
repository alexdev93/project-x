import { createHash } from "node:crypto";
import { getAiConfig } from "@/lib/ai/config";
import type { Source } from "@/lib/rag/types";

/**
 * In-memory cache for completed answers.
 *
 * Portfolio traffic is dominated by the same handful of questions — the
 * suggested prompts especially — so caching them keeps repeat visitors off the
 * free-tier quota entirely.
 *
 * Scope: state lives in the process, so on serverless each instance keeps its
 * own copy and a cold start begins empty. That is the right trade here — it
 * needs no extra service, cannot serve one visitor's data to another, and a miss
 * costs only what the request would have cost anyway. A shared cache (Redis,
 * Upstash) would swap free infrastructure for a paid dependency to save a few
 * model calls; not worth it at this size.
 *
 * Only the first turn of a conversation is cacheable — see `cacheKey`.
 */

export type CachedAnswer = {
  text: string;
  sources: Source[];
};

type Entry = CachedAnswer & { expiresAt: number };

const MAX_ENTRIES = 200;
const store = new Map<string, Entry>();

/**
 * Normalises a question so trivially different phrasings share an entry:
 * case, surrounding whitespace, and trailing punctuation are not meaningful.
 */
export function normaliseQuestion(question: string): string {
  return (
    question
      .toLowerCase()
      .replace(/\s+/g, " ")
      // Trim before stripping punctuation: with trailing whitespace still
      // present the end-anchored match never fires, so "alex?? " kept its "??"
      // and missed the cache entry for "alex?".
      .trim()
      .replace(/[?!.,;:]+$/g, "")
      .trim()
  );
}

/**
 * Returns a cache key, or null when the exchange must not be cached.
 *
 * Only single-question conversations are cached. Once there is history the
 * answer depends on it, and keying on the whole transcript would produce
 * near-zero hits while risking one visitor's thread influencing another's.
 */
export function cacheKey(
  messages: { role: string; content: string }[],
): string | null {
  if (messages.length !== 1) return null;

  const [only] = messages;
  if (only.role !== "user") return null;

  const normalised = normaliseQuestion(only.content);
  if (!normalised) return null;

  const { model, ragTopK } = getAiConfig();
  // Model and top-K are part of the key: changing either changes the answer,
  // and a stale entry from the previous setting would be wrong.
  return createHash("sha256")
    .update(`${model}|${ragTopK}|${normalised}`)
    .digest("hex")
    .slice(0, 32);
}

export function getCached(key: string): CachedAnswer | null {
  const { cacheTtlSeconds } = getAiConfig();
  if (cacheTtlSeconds === 0) return null;

  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  // Refresh recency for the eviction pass below.
  store.delete(key);
  store.set(key, entry);

  return { text: entry.text, sources: entry.sources };
}

export function setCached(key: string, answer: CachedAnswer): void {
  const { cacheTtlSeconds } = getAiConfig();
  if (cacheTtlSeconds === 0) return;

  // Never cache an empty or failed answer — it would pin the failure for the
  // whole TTL.
  if (!answer.text.trim()) return;

  if (store.size >= MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the least recently
    // used given the refresh in getCached.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  store.set(key, {
    ...answer,
    expiresAt: Date.now() + cacheTtlSeconds * 1000,
  });
}

/** Test hook. */
export function clearCache(): void {
  store.clear();
}

export function cacheSize(): number {
  return store.size;
}
