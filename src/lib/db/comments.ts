import { getSql } from "./client";
import type {
  Comment,
  CommentNode,
  CommentStatus,
  ModerationItem,
} from "@/lib/blog/types";
import { COMMENT_STATUSES } from "@/lib/blog/types";

/**
 * Every query against `post_comments` lives here.
 *
 * The organising idea, and the reason this file is worth reading before changing:
 * **authorization is expressed as SQL, not as an `if`.** Ownership, the edit
 * window, whether the post is published, and whether a parent may be replied to
 * are all predicates inside the statement that does the work. An unauthorised
 * request therefore matches zero rows, and every caller maps zero rows to the
 * same 404 — so there is no path where a forgotten check does damage, and no
 * response that reveals whether the row existed.
 *
 * Two consequences follow deliberately:
 *
 *  * There is no `deleteComment(id)`. The visitor-facing functions take a
 *    `userId` in their signature, so a route that forgets to scope by author does
 *    not compile. The administrator's unscoped delete has a different name and is
 *    only reachable from behind `requireAdmin()`.
 *  * The public projection selects `name` and `image` from the user table and
 *    never `email`. The admin projection is a separate function, so widening the
 *    public shape by accident is not possible.
 *
 * No try/catch — see the note in knowledge.ts.
 */

type Row = {
  id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  status: string;
  created_at: string;
  edited_at: string | null;
  name: string;
  image: string | null;
  post_slug?: string;
  post_title?: string;
};

function toStatus(value: string): CommentStatus {
  return (COMMENT_STATUSES as readonly string[]).includes(value)
    ? (value as CommentStatus)
    : "hidden";
}

function toComment(row: Row): Comment {
  return {
    id: row.id,
    parentId: row.parent_id,
    authorId: row.user_id,
    authorName: row.name,
    authorImage: row.image,
    // A withdrawn comment's text is already empty in the database; this is a
    // second line of defence so a stale row can never render its old body.
    body: row.status === "deleted" ? "" : row.body,
    status: toStatus(row.status),
    createdAt: new Date(row.created_at),
    editedAt: row.edited_at ? new Date(row.edited_at) : null,
  };
}

/**
 * A whole thread, flat, in one query — then grouped into exactly two levels.
 *
 * Grouping in application code rather than with a recursive CTE is the right
 * trade here: the depth is capped at one by the schema, so there is no recursion
 * to express, and one indexed read beats a CTE that would still need shaping
 * afterwards.
 *
 * `viewerId` widens the result to include that visitor's own pending comments, so
 * someone whose comment is held for approval can see it (marked as pending)
 * instead of watching it vanish. It never reveals anyone else's pending comment.
 */
export async function listThread(
  postId: string,
  viewerId: string | null,
): Promise<CommentNode[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT c.id, c.parent_id, c.user_id, c.body, c.status, c.created_at,
           c.edited_at, u."name", u."image"
    FROM post_comments c
    JOIN "auth_user" u ON u."id" = c.user_id
    WHERE c.post_id = ${postId}
      AND (
        c.status IN ('visible', 'deleted')
        OR (c.status = 'pending' AND c.user_id = ${viewerId})
      )
    ORDER BY c.created_at ASC
  `) as Row[];

  const comments = rows.map(toComment);
  const tops = comments.filter((comment) => comment.parentId === null);
  const repliesByParent = new Map<string, Comment[]>();

  for (const comment of comments) {
    if (!comment.parentId) continue;
    const bucket = repliesByParent.get(comment.parentId);
    if (bucket) bucket.push(comment);
    else repliesByParent.set(comment.parentId, [comment]);
  }

  return tops.map((top) => ({
    ...top,
    replies: repliesByParent.get(top.id) ?? [],
  }));
}

/**
 * A new top-level comment.
 *
 * The post is resolved *inside* the insert, from a slug, against the same filter
 * every public read uses. Three things fall out of that: the client never handles
 * a post id, commenting on a draft or a not-yet-due scheduled post is impossible
 * without a separate check, and a bad slug returns zero rows for the route to
 * turn into a 404.
 */
export async function createComment({
  slug,
  userId,
  body,
  status,
}: {
  slug: string;
  userId: string;
  body: string;
  status: CommentStatus;
}): Promise<{ id: string; postId: string; status: CommentStatus } | null> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO post_comments (post_id, user_id, body, depth, status)
    SELECT p.id, ${userId}, ${body}, 0, ${status}
    FROM posts p
    WHERE p.slug = ${slug}
      AND p.status = 'published'
      AND p.published_at <= now()
    RETURNING id, post_id, status
  `) as { id: string; post_id: string; status: string }[];

  const row = rows[0];
  return row
    ? { id: row.id, postId: row.post_id, status: toStatus(row.status) }
    : null;
}

/**
 * A reply, one level deep.
 *
 * `post_id` is inherited from the parent row rather than supplied, so a reply
 * cannot be attached to a post other than its parent's. The `WHERE` carries two
 * more invariants: `parent_id IS NULL` rejects a reply to a reply, and the status
 * check rejects a reply to something hidden or withdrawn. All of them produce the
 * same empty result, and therefore the same 404.
 */
export async function createReply({
  parentId,
  userId,
  body,
  status,
}: {
  parentId: string;
  userId: string;
  body: string;
  status: CommentStatus;
}): Promise<{ id: string; postId: string; status: CommentStatus } | null> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO post_comments (post_id, parent_id, user_id, body, depth, status)
    SELECT p.post_id, p.id, ${userId}, ${body}, 1, ${status}
    FROM post_comments p
    WHERE p.id = ${parentId}
      AND p.parent_id IS NULL
      AND p.status = 'visible'
    RETURNING id, post_id, status
  `) as { id: string; post_id: string; status: string }[];

  const row = rows[0];
  return row
    ? { id: row.id, postId: row.post_id, status: toStatus(row.status) }
    : null;
}

/**
 * Edit one's own comment, inside the window.
 *
 * `userId` is required by the signature and the window is an interval predicate,
 * so neither check can be left out at the call site. The window is passed in from
 * configuration rather than hardcoded here.
 */
export async function updateOwnComment({
  id,
  userId,
  body,
  windowMinutes,
}: {
  id: string;
  userId: string;
  body: string;
  windowMinutes: number;
}): Promise<{ id: string; postSlug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE post_comments c SET body = ${body}, edited_at = now()
    WHERE c.id = ${id}
      AND c.user_id = ${userId}
      AND c.status = 'visible'
      /* The cast is required: an untyped parameter beside an interval leaves
         Postgres unable to pick an operator. A block comment rather than a
         line comment, so the statement survives being flattened onto one line. */
      AND c.created_at > now() - (interval '1 minute' * ${windowMinutes}::int)
    RETURNING c.id, (SELECT p.slug FROM posts p WHERE p.id = c.post_id) AS post_slug
  `) as { id: string; post_slug: string }[];

  const row = rows[0];
  return row ? { id: row.id, postSlug: row.post_slug } : null;
}

/**
 * Withdraw one's own comment.
 *
 * Soft, and the body is cleared in the same statement rather than left for a
 * later pass. Soft because a reply beneath it needs its parent to keep existing;
 * cleared because "deleted" must mean the words are gone, not merely hidden
 * behind a status a future query might forget to filter on.
 */
export async function softDeleteOwnComment({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<{ id: string; postSlug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE post_comments c
    SET body = '', status = 'deleted', edited_at = now()
    WHERE c.id = ${id} AND c.user_id = ${userId} AND c.status = 'visible'
    RETURNING c.id, (SELECT p.slug FROM posts p WHERE p.id = c.post_id) AS post_slug
  `) as { id: string; post_slug: string }[];

  const row = rows[0];
  return row ? { id: row.id, postSlug: row.post_slug } : null;
}

/** Whether this visitor is blocked from commenting. */
export async function isBlocked(userId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT 1 AS one FROM blocked_users WHERE user_id = ${userId}
  `) as { one: number }[];

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Administrator functions. Unscoped by author, and reachable only from behind
// requireAdmin(). The projection here is the only one that includes an email.
// ---------------------------------------------------------------------------

/**
 * The moderation queue: pending first, then the rest, newest first within each.
 *
 * Pending before visible because the queue exists to be worked through, and
 * anything waiting on a decision is the reason to open the page.
 */
export async function listCommentsForModeration(
  limit: number,
): Promise<ModerationItem[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT c.id, c.parent_id, c.user_id, c.body, c.status, c.created_at,
           c.edited_at, u."name", u."image",
           p.slug AS post_slug, p.title AS post_title
    FROM post_comments c
    JOIN "auth_user" u ON u."id" = c.user_id
    JOIN posts p ON p.id = c.post_id
    WHERE c.status <> 'deleted'
    ORDER BY (c.status = 'pending') DESC, c.created_at DESC
    LIMIT ${limit}
  `) as Row[];

  return rows.map((row) => ({
    ...toComment(row),
    postSlug: row.post_slug ?? "",
    postTitle: row.post_title ?? "",
  }));
}

/** Approve or hide a comment. Returns the post slug so the route can revalidate. */
export async function setCommentStatus(
  id: string,
  status: Extract<CommentStatus, "visible" | "hidden">,
): Promise<{ id: string; postSlug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE post_comments c SET status = ${status}
    WHERE c.id = ${id}
    RETURNING c.id, (SELECT p.slug FROM posts p WHERE p.id = c.post_id) AS post_slug
  `) as { id: string; post_slug: string }[];

  const row = rows[0];
  return row ? { id: row.id, postSlug: row.post_slug } : null;
}

/**
 * Hard delete, administrator only.
 *
 * The self-referencing foreign key's cascade removes the replies underneath in
 * the same statement, which is the one case where removing a comment's replies is
 * the intent rather than collateral damage.
 */
export async function deleteCommentAsAdmin(
  id: string,
): Promise<{ id: string; postSlug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM post_comments c
    WHERE c.id = ${id}
    RETURNING c.id, (SELECT p.slug FROM posts p WHERE p.id = c.post_id) AS post_slug
  `) as { id: string; post_slug: string }[];

  const row = rows[0];
  return row ? { id: row.id, postSlug: row.post_slug } : null;
}

export async function countPendingComments(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM post_comments WHERE status = 'pending'
  `) as { n: number }[];

  return rows[0]?.n ?? 0;
}
