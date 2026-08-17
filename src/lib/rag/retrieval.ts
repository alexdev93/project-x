import { getAiConfig, hasVectorStore } from "@/lib/ai/config";
import { searchChunks } from "@/lib/db/knowledge";
import { embedQuery } from "./embeddings";
import type { KnowledgeCategory, RetrievedChunk, Source } from "./types";

/**
 * Semantic search over the knowledge base.
 *
 * Retrieval here is deliberately **best-effort**. This corpus is a fraction of
 * the model's context window, so the full knowledge base is sent to the model
 * regardless; retrieval's job is to identify *which* content an answer draws on,
 * so the reply can cite sources.
 *
 * That makes it an enhancement rather than a dependency, and the code is written
 * to match: any failure — a cold or missing database, an embedding error, a
 * timeout — returns no sources and lets the answer proceed. Free-tier Postgres
 * autosuspends, so "the database is asleep" is a normal condition, not an
 * incident.
 *
 * If the corpus later outgrows the context window, `buildContext` becomes the
 * place to switch from full-context to top-K truncation.
 */

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  sources: Source[];
  /** False when retrieval was skipped or failed; the answer is unaffected. */
  available: boolean;
};

const EMPTY: RetrievalResult = { chunks: [], sources: [], available: false };

/** Public citation shape — no ids, scores, hashes or internal source keys. */
function toSources(chunks: RetrievedChunk[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const chunk of chunks) {
    // Several chunks can share a page (five skill groups all point at /about);
    // cite each destination once.
    const key = chunk.metadata.url ?? chunk.metadata.title;
    if (seen.has(key)) continue;
    seen.add(key);

    sources.push({
      title: chunk.metadata.title,
      type: chunk.metadata.category,
      url: chunk.metadata.url,
    });
  }

  return sources;
}

export async function retrieve(
  query: string,
  options: { topK?: number; category?: KnowledgeCategory; timeoutMs?: number } = {},
): Promise<RetrievalResult> {
  if (!hasVectorStore()) return EMPTY;

  const trimmed = query.trim();
  if (!trimmed) return EMPTY;

  const config = getAiConfig();
  const topK = options.topK ?? config.ragTopK;

  try {
    // Bounded so a sleeping database cannot hold up the answer. The user gets a
    // reply without citations instead of waiting for a cold start.
    const chunks = await withTimeout(
      (async () => {
        const embedding = await embedQuery(trimmed);
        return searchChunks(embedding, {
          topK,
          minScore: config.ragMinScore,
          category: options.category,
        });
      })(),
      options.timeoutMs ?? 4000,
    );

    return { chunks, sources: toSources(chunks), available: true };
  } catch (error) {
    // Logged, never surfaced: citations are a bonus, not part of the contract.
    console.warn(
      "Retrieval unavailable, answering without citations:",
      error instanceof Error ? error.message : error,
    );
    return EMPTY;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Retrieval timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
