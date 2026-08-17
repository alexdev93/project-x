import { neon } from "@neondatabase/serverless";

/**
 * Postgres access for the knowledge base.
 *
 * Uses Neon's HTTP driver rather than a TCP pool. Serverless functions are
 * short-lived and can scale to many concurrent instances, and a pool per
 * instance exhausts Postgres connection slots quickly. The HTTP driver issues
 * one stateless request per query, which is the right shape for this workload —
 * a handful of small reads per chat message.
 *
 * DATABASE_URL is optional by design. When it is unset the assistant runs
 * without retrieval, so a missing database degrades citations rather than
 * breaking the chat. See `hasVectorStore` in lib/ai/config.
 */

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "DatabaseNotConfiguredError";
  }
}

type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;

export function getSql(): Sql {
  if (!process.env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

/**
 * pgvector's text input format. Kept in one place so no caller hand-builds it,
 * and so the values are always finite — NaN or Infinity would be accepted as
 * text and then fail inside Postgres with a far less obvious error.
 */
export function toVectorLiteral(embedding: number[]): string {
  for (const value of embedding) {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contains a non-finite value");
    }
  }
  return `[${embedding.join(",")}]`;
}
