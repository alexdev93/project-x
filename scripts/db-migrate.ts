/**
 * Applies src/lib/db/schema.sql.
 *
 *   yarn db:migrate
 *
 * Safe to re-run — every statement in the schema is guarded. Requires
 * DATABASE_URL; the vector column width is taken from the schema file, so
 * changing AI_EMBEDDING_DIMENSIONS means editing that file too (see docs/AI.md).
 */

// Must be first: populates process.env from .env.local.
import "./_env";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set.\n" +
        "Add it to .env.local (see .env.example) and re-run.",
    );
    process.exit(1);
  }

  const schemaPath = join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const sql = neon(url);

  // Split on semicolons at line ends so comments stay attached to their
  // statement; the HTTP driver executes one statement per request.
  const statements = schema
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s && !s.split("\n").every((l) => l.trim().startsWith("--")));

  console.log(`Applying ${statements.length} statements…`);
  for (const statement of statements) {
    const label = statement.split("\n").find((l) => !l.trim().startsWith("--"));
    try {
      await sql.query(statement);
      console.log(`  ok  ${label?.slice(0, 68)}`);
    } catch (error) {
      console.error(`  fail  ${label?.slice(0, 68)}`);
      throw error;
    }
  }

  const rows = (await sql`
    SELECT count(*)::int AS n FROM knowledge_chunks
  `) as { n: number }[];
  console.log(`\nSchema applied. knowledge_chunks holds ${rows[0]?.n ?? 0} rows.`);
  console.log("Next: yarn ingest");
}

main().catch((error) => {
  console.error("\nMigration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
