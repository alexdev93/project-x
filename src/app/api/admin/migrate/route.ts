import { requireAdmin } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { databaseError, notFound, okResponse } from "@/lib/http/guards";

/**
 * TEMPORARY. Applies the LinkedIn caption/gallery columns from schema.sql's
 * 2026-09-07 evolution by hand, once, then this file gets deleted.
 *
 * Exists for the same reason as the migrate route it follows: this sandbox
 * has no network path to Neon, and the new `.github/workflows/migrate.yml`
 * needs an `ENV_VAULT_TOKEN` repo secret that isn't set yet. Running the
 * same idempotent statements through the deployed app instead, over a route
 * only an admin session can reach.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const sql = getSql();

  try {
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_commentary TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS post_linkedin_images (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id      UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        position     SMALLINT NOT NULL,
        linkedin_urn TEXT NOT NULL,
        alt_text     TEXT NOT NULL DEFAULT '',
        UNIQUE (post_id, position)
      )
    `;

    return okResponse({ applied: true });
  } catch (error) {
    return databaseError(error, "admin/migrate");
  }
}
