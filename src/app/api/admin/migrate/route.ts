import { requireAdmin } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { databaseError, notFound, okResponse } from "@/lib/http/guards";

/**
 * TEMPORARY. Applies the LinkedIn columns from schema.sql's 2026-09-06
 * evolution by hand, once, then this file gets deleted.
 *
 * Exists only because the sandbox this was developed in has no network path
 * to Neon at all (confirmed: raw fetch to the pooler host times out, while
 * the deployed app — this very route — reaches it fine), so `pnpm db:migrate`
 * cannot run from there. Running the same three idempotent
 * `ADD COLUMN IF NOT EXISTS` statements through the deployed app instead,
 * over a route only an admin session can reach.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const sql = getSql();

  try {
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_post_urn TEXT`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_attachment_urn TEXT`;
    await sql`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_attachment_kind TEXT
      CHECK (linkedin_attachment_kind IS NULL OR linkedin_attachment_kind IN ('image', 'document'))
    `;

    return okResponse({ applied: true });
  } catch (error) {
    return databaseError(error, "admin/migrate");
  }
}
