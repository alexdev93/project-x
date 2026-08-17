import { getSql, toVectorLiteral } from "./client";
import type {
  KnowledgeCategory,
  KnowledgeChunk,
  RetrievedChunk,
} from "@/lib/rag/types";

/**
 * Every query against knowledge_chunks lives here.
 *
 * This is the only module that writes SQL. The agent and its tools call typed
 * functions in this file; no model output ever reaches a query. All values are
 * passed as parameters through the driver's tagged template, so a chunk's text
 * or a user's question cannot alter the statement.
 */

type Row = {
  id: string;
  content: string;
  source: string;
  category: string;
  title: string;
  url: string | null;
  content_hash: string;
  score?: number;
};

const CATEGORIES: readonly KnowledgeCategory[] = [
  "profile",
  "experience",
  "project",
  "skills",
  "education",
  "contact",
];

/** Narrow a database string back to the union, rather than trusting the cast. */
function toCategory(value: string): KnowledgeCategory {
  return (CATEGORIES as readonly string[]).includes(value)
    ? (value as KnowledgeCategory)
    : "profile";
}

function toChunk(row: Row): KnowledgeChunk {
  return {
    id: row.id,
    content: row.content,
    contentHash: row.content_hash,
    metadata: {
      source: row.source,
      category: toCategory(row.category),
      title: row.title,
      url: row.url ?? undefined,
    },
  };
}

/** Existing ids and hashes, so ingestion can skip unchanged chunks. */
export async function getChunkHashes(): Promise<Map<string, string>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, content_hash FROM knowledge_chunks
  `) as Pick<Row, "id" | "content_hash">[];

  return new Map(rows.map((row) => [row.id, row.content_hash]));
}

export async function upsertChunk(
  chunk: KnowledgeChunk,
  embedding: number[],
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO knowledge_chunks
      (id, content, source, category, title, url, content_hash, embedding)
    VALUES (
      ${chunk.id}, ${chunk.content}, ${chunk.metadata.source},
      ${chunk.metadata.category}, ${chunk.metadata.title},
      ${chunk.metadata.url ?? null}, ${chunk.contentHash},
      ${toVectorLiteral(embedding)}::vector
    )
    ON CONFLICT (id) DO UPDATE SET
      content      = EXCLUDED.content,
      source       = EXCLUDED.source,
      category     = EXCLUDED.category,
      title        = EXCLUDED.title,
      url          = EXCLUDED.url,
      content_hash = EXCLUDED.content_hash,
      embedding    = EXCLUDED.embedding,
      updated_at   = now()
  `;
}

/** Removes rows whose chunk no longer exists in the content. */
export async function deleteChunksExcept(keepIds: string[]): Promise<number> {
  const sql = getSql();
  // An empty ANY(...) would delete everything, so guard the empty case.
  const rows = keepIds.length
    ? ((await sql`
        DELETE FROM knowledge_chunks
        WHERE id <> ALL(${keepIds}) RETURNING id
      `) as { id: string }[])
    : ((await sql`DELETE FROM knowledge_chunks RETURNING id`) as {
        id: string;
      }[]);
  return rows.length;
}

/**
 * Cosine similarity search.
 *
 * pgvector's `<=>` is cosine *distance* in [0,2]; `1 - distance` converts it to
 * a similarity in [-1,1], which is the number callers threshold against.
 */
export async function searchChunks(
  embedding: number[],
  { topK, minScore, category }: {
    topK: number;
    minScore: number;
    category?: KnowledgeCategory;
  },
): Promise<RetrievedChunk[]> {
  const sql = getSql();
  const vector = toVectorLiteral(embedding);

  const rows = (category
    ? await sql`
        SELECT id, content, source, category, title, url, content_hash,
               1 - (embedding <=> ${vector}::vector) AS score
        FROM knowledge_chunks
        WHERE category = ${category}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${topK}
      `
    : await sql`
        SELECT id, content, source, category, title, url, content_hash,
               1 - (embedding <=> ${vector}::vector) AS score
        FROM knowledge_chunks
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${topK}
      `) as Row[];

  return rows
    .map((row) => ({ ...toChunk(row), score: Number(row.score ?? 0) }))
    .filter((chunk) => chunk.score >= minScore);
}

export async function countChunks(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM knowledge_chunks
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}
