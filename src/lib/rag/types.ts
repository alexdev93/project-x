/**
 * Shared RAG types.
 *
 * `KnowledgeChunk` is what ingestion produces and the store persists.
 * `RetrievedChunk` adds the similarity score from a search.
 */

/** Where a chunk came from. Drives grouping and the citation label. */
export type KnowledgeCategory =
  | "profile"
  | "experience"
  | "project"
  | "skills"
  | "education"
  | "contact";

export type ChunkMetadata = {
  /** Stable logical source, e.g. "projects/zemenawi-crm". */
  source: string;
  category: KnowledgeCategory;
  /** Human-readable label, used verbatim in citations. */
  title: string;
  /** Site path this chunk is about, when one exists. */
  url?: string;
};

export type KnowledgeChunk = {
  /**
   * Deterministic id derived from the source and ordinal, so re-ingesting the
   * same content updates rows in place instead of accumulating duplicates.
   */
  id: string;
  content: string;
  metadata: ChunkMetadata;
  /** Hash of `content`, used to skip re-embedding unchanged chunks. */
  contentHash: string;
};

export type RetrievedChunk = KnowledgeChunk & {
  /** Cosine similarity in [0,1]; higher is closer. */
  score: number;
};

/**
 * What the API exposes as a citation. Deliberately narrow: no database ids, no
 * embeddings, no scores, no internal source keys beyond the public path.
 */
export type Source = {
  title: string;
  type: KnowledgeCategory;
  url?: string;
};
