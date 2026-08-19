import { neon } from "@neondatabase/serverless";

/**
 * Postgres access for the application's own queries.
 *
 * Uses Neon's HTTP driver rather than a TCP pool. Serverless functions are
 * short-lived and can scale to many concurrent instances, and a pool per
 * instance exhausts Postgres connection slots quickly. The HTTP driver issues
 * one stateless request per query, which is the right shape for this workload —
 * a handful of small reads per chat message, and a single statement per blog
 * write.
 *
 * The consequence worth stating plainly: **there are no transactions here.**
 * Every write in src/lib/db/* is therefore a single statement whose effect
 * depends on current state rather than on a value read a moment earlier. See the
 * header of schema.sql for what that means in practice.
 *
 * One exception exists, and it is not this file's. Better Auth reaches the
 * database through Kysely, whose Postgres dialect acquires a client with
 * `pool.connect()` — something Neon's `poolQueryViaFetch` shortcut does not
 * cover, since it only intercepts `pool.query()`. So src/lib/auth/server.ts
 * constructs its own WebSocket-backed `Pool`, capped at one connection and
 * touched only by `/api/auth/*` requests. That is the sole place in the project
 * with a real connection, it is deliberate, and it is confined to one file so it
 * stays visible.
 *
 * DATABASE_URL is optional by design. When it is unset the assistant runs
 * without retrieval and the blog renders an empty state, so a missing database
 * degrades features rather than breaking pages. See `hasVectorStore` in
 * lib/ai/config and `hasBlog` in lib/blog/config.
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
