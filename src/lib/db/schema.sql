-- Knowledge base schema for the portfolio assistant.
--
-- Apply with:  yarn db:migrate
-- Safe to re-run: every statement is guarded.
--
-- Dimension note: the vector width must match AI_EMBEDDING_DIMENSIONS (default
-- 768). Changing that setting requires recreating the column, because pgvector
-- fixes dimensionality per column — see docs/AI.md.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  -- Deterministic, derived from source and ordinal ("projects/zemenawi-crm#0"),
  -- so re-ingesting updates rows in place instead of accumulating duplicates.
  id           TEXT PRIMARY KEY,
  content      TEXT NOT NULL,
  source       TEXT NOT NULL,
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  -- Hash of `content`; lets ingestion skip embedding work for unchanged chunks.
  content_hash TEXT NOT NULL,
  embedding    VECTOR(768) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filtering by category is cheap and common ("only search projects").
CREATE INDEX IF NOT EXISTS knowledge_chunks_category_idx
  ON knowledge_chunks (category);

-- No ANN index on purpose.
--
-- An HNSW or IVFFlat index only pays off in the thousands of rows; this table
-- holds a couple of dozen. A sequential scan with exact cosine distance is both
-- faster here and perfectly accurate, whereas an ANN index would add build
-- cost, memory, and approximate results for no gain. Revisit past ~5k rows.
