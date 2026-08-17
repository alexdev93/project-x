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

/**
 * How far below the best match a chunk may score and still be cited.
 *
 * The absolute floor (`RAG_MIN_SCORE`) separates relevant from irrelevant, and
 * it does that well for specific questions, which show a clear cliff: "where did
 * he study" scores 0.663 then drops to 0.613. Broad questions have no cliff —
 * "what does Alex do" scored 0.759, 0.703, 0.668, 0.667, 0.667, 0.662, because
 * half the corpus is mildly on-topic. Citing all six implied the answer drew on
 * projects it never mentioned.
 *
 * A relative floor fixes that without touching the absolute one: keep what is
 * close to the best match, drop the long tail. Measured over five probe queries,
 * 0.06 kept every chunk the answer actually used and dropped every one it did
 * not.
 */
const SCORE_MARGIN = 0.06;

/**
 * Drops matches far weaker than the best one, so a vague question cites its two
 * real sources instead of everything above the floor.
 */
function keepClosest(chunks: RetrievedChunk[]): RetrievedChunk[] {
  if (chunks.length === 0) return chunks;

  // searchChunks orders by descending similarity, so the first is the best.
  const floor = chunks[0].score - SCORE_MARGIN;
  return chunks.filter((chunk) => chunk.score >= floor);
}

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

    const cited = keepClosest(chunks);
    return { chunks: cited, sources: toSources(cited), available: true };
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
