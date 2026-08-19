import { getSql } from "./client";
import type { BlogUser } from "@/lib/blog/types";

/**
 * Reads over Better Auth's user table, and the block list beside it.
 *
 * Every function here is administrator-only, which is why this is the one module
 * whose projection includes an email address. Nothing public joins to
 * `auth_user` for anything but a display name and a picture — see the note in
 * comments.ts.
 *
 * Read-only with respect to authentication: this file never writes to an
 * `auth_*` table. Those are Better Auth's to own, and a stray UPDATE here would
 * be invisible to it.
 *
 * Note the quoted camelCase identifiers. They are the library's convention, not
 * ours, and the quotes are mandatory — see the header of schema.sql.
 */

type Row = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  blocked: boolean;
  comment_count: number;
};

export async function listUsers(limit: number): Promise<BlogUser[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT u."id", u."name", u."email", u."image", u."createdAt",
           EXISTS (SELECT 1 FROM blocked_users b WHERE b.user_id = u."id") AS blocked,
           (SELECT count(*) FROM post_comments c
             WHERE c.user_id = u."id" AND c.status <> 'deleted')::int AS comment_count
    FROM "auth_user" u
    ORDER BY u."createdAt" DESC
    LIMIT ${limit}
  `) as Row[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    createdAt: new Date(row.createdAt),
    blocked: row.blocked,
    commentCount: row.comment_count,
  }));
}

/**
 * Block a visitor from commenting.
 *
 * Idempotent by conflict, so a double-submitted form is harmless. The reason is
 * stored for the owner's own benefit — it is never shown to the blocked visitor,
 * who simply finds that their comment is refused.
 */
export async function blockUser(
  userId: string,
  reason: string,
): Promise<{ userId: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO blocked_users (user_id, reason)
    SELECT u."id", ${reason} FROM "auth_user" u WHERE u."id" = ${userId}
    ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason
    RETURNING user_id
  `) as { user_id: string }[];

  return rows[0] ? { userId: rows[0].user_id } : null;
}

export async function unblockUser(
  userId: string,
): Promise<{ userId: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM blocked_users WHERE user_id = ${userId} RETURNING user_id
  `) as { user_id: string }[];

  return rows[0] ? { userId: rows[0].user_id } : null;
}

export async function countUsers(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM "auth_user"
  `) as { n: number }[];

  return rows[0]?.n ?? 0;
}
