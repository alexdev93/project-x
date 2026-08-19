import { getSql } from "./client";

/**
 * Every query against `post_reactions` lives here.
 *
 * This file exists mostly to house one statement, and that statement is the
 * reason the table has an `active` column instead of rows that come and go.
 */

/**
 * Toggle this visitor's like on a post, in one statement.
 *
 * Why this shape rather than the two obvious alternatives:
 *
 *  * A `DELETE`-then-`INSERT` pair is two HTTP round trips with no transaction
 *    around them, so a failure between the two leaves the wrong answer stored.
 *  * A single data-modifying CTE — `WITH removed AS (DELETE …), added AS (INSERT
 *    … WHERE NOT EXISTS (SELECT 1 FROM removed))` — looks like it solves that in
 *    one statement, but Postgres explicitly does not guarantee execution order
 *    between sibling `WITH` sub-statements, so it rests on an implementation
 *    detail.
 *
 * `ON CONFLICT DO UPDATE SET active = NOT active` has neither problem: one
 * statement, and the conflict path takes a row lock so two concurrent taps
 * serialise instead of racing. `RETURNING active` hands back the authoritative
 * new state, which is what the optimistic button reconciles against — so a
 * double-click cannot leave the UI disagreeing with the database.
 *
 * The post is resolved from its slug inside the statement, against the same
 * published filter every public read uses, so liking a draft matches no rows and
 * the route returns 404.
 */
export async function toggleReaction({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}): Promise<{ active: boolean } | null> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO post_reactions (post_id, user_id, active)
    SELECT p.id, ${userId}, TRUE
    FROM posts p
    WHERE p.slug = ${slug}
      AND p.status = 'published'
      AND p.published_at <= now()
    ON CONFLICT (post_id, user_id)
    DO UPDATE SET active = NOT post_reactions.active, updated_at = now()
    RETURNING active
  `) as { active: boolean }[];

  return rows[0] ? { active: rows[0].active } : null;
}

/**
 * The count, plus whether this visitor is among them.
 *
 * Two facts from one round trip. `viewerId` may be null for a signed-out reader,
 * in which case `liked` is false — `user_id = NULL` is NULL, never true, so the
 * empty case needs no branch.
 */
export async function getReactionState({
  slug,
  viewerId,
}: {
  slug: string;
  viewerId: string | null;
}): Promise<{ count: number; liked: boolean } | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      (SELECT count(*) FROM post_reactions r
        WHERE r.post_id = p.id AND r.active)::int AS count,
      EXISTS (
        SELECT 1 FROM post_reactions r
        WHERE r.post_id = p.id AND r.active AND r.user_id = ${viewerId}
      ) AS liked
    FROM posts p
    WHERE p.slug = ${slug}
      AND p.status = 'published'
      AND p.published_at <= now()
  `) as { count: number; liked: boolean }[];

  return rows[0] ?? null;
}
