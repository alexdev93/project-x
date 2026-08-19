import { getSql } from "./client";
import type { Page, Post, PostStatus, PostSummary } from "@/lib/blog/types";
import { POST_STATUSES } from "@/lib/blog/types";

/**
 * Every query against `posts` lives here.
 *
 * Follows the shape src/lib/db/knowledge.ts established: a private snake_case
 * `Row` type, private mappers, unions narrowed by membership rather than cast,
 * values passed only as driver parameters, and **no try/catch** — resilience
 * policy belongs one layer up, in src/lib/blog/service.ts.
 *
 * Two invariants hold across the whole file:
 *
 *  1. Every public read filters `status = 'published' AND published_at <= now()`.
 *     Draft and scheduled posts are invisible here, not merely unlinked, which is
 *     what makes a draft 404 rather than leak. The admin reads are separately
 *     named so widening the public shape by accident is not possible.
 *  2. Every UPDATE sets `updated_at`, because the schema has no trigger to do it
 *     (see the note at the top of schema.sql).
 */

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  tags: string[] | null;
  status?: string;
  pinned: boolean;
  reading_minutes: number;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
  like_count?: number;
  comment_count?: number;
  total?: number;
};

function toStatus(value: string | undefined): PostStatus {
  return (POST_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as PostStatus)
    : "draft";
}

function toSummary(row: Row): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    tags: row.tags ?? [],
    pinned: row.pinned,
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
  };
}

function toPost(row: Row): Post {
  return {
    ...toSummary(row),
    body: row.body ?? "",
    status: toStatus(row.status),
    createdAt: new Date(row.created_at ?? row.published_at ?? Date.now()),
    updatedAt: new Date(row.updated_at ?? row.created_at ?? Date.now()),
  };
}

/**
 * The feed.
 *
 * One round trip for the rows, their counts, and the total. The two counts are
 * correlated subqueries rather than stored columns: a cached counter would need
 * read-modify-write, which is precisely what has no transaction to protect it,
 * and a visibly wrong number is worse than a slightly slower query. Both
 * subqueries hit a primary-key index over a handful of rows.
 *
 * `count(*) OVER ()` rides along so pagination does not cost a second query.
 */
export async function listPublishedPosts({
  limit,
  offset,
  page,
}: {
  limit: number;
  offset: number;
  page: number;
}): Promise<Page<PostSummary>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id, p.slug, p.title, p.excerpt, p.tags, p.pinned,
           p.reading_minutes, p.published_at,
           (SELECT count(*) FROM post_reactions r
             WHERE r.post_id = p.id AND r.active)::int AS like_count,
           (SELECT count(*) FROM post_comments c
             WHERE c.post_id = p.id AND c.status = 'visible')::int AS comment_count,
           count(*) OVER ()::int AS total
    FROM posts p
    WHERE p.status = 'published' AND p.published_at <= now()
    ORDER BY p.pinned DESC, p.published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as Row[];

  const total = rows[0]?.total ?? 0;

  return {
    items: rows.map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

/** The newest few, for the home page strip. */
export async function listRecentPosts(limit: number): Promise<PostSummary[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id, p.slug, p.title, p.excerpt, p.tags, p.pinned,
           p.reading_minutes, p.published_at,
           (SELECT count(*) FROM post_reactions r
             WHERE r.post_id = p.id AND r.active)::int AS like_count,
           (SELECT count(*) FROM post_comments c
             WHERE c.post_id = p.id AND c.status = 'visible')::int AS comment_count
    FROM posts p
    WHERE p.status = 'published' AND p.published_at <= now()
    ORDER BY p.pinned DESC, p.published_at DESC
    LIMIT ${limit}
  `) as Row[];

  return rows.map(toSummary);
}

/** One published post by slug, or null. A draft is null here, not an error. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id, p.slug, p.title, p.excerpt, p.body, p.tags, p.status, p.pinned,
           p.reading_minutes, p.published_at, p.created_at, p.updated_at,
           (SELECT count(*) FROM post_reactions r
             WHERE r.post_id = p.id AND r.active)::int AS like_count,
           (SELECT count(*) FROM post_comments c
             WHERE c.post_id = p.id AND c.status = 'visible')::int AS comment_count
    FROM posts p
    WHERE p.slug = ${slug} AND p.status = 'published' AND p.published_at <= now()
  `) as Row[];

  return rows[0] ? toPost(rows[0]) : null;
}

/** Slugs for generateStaticParams. Published only, so drafts get no route. */
export async function listPublishedSlugs(): Promise<
  { slug: string; publishedAt: Date }[]
> {
  const sql = getSql();
  const rows = (await sql`
    SELECT slug, published_at
    FROM posts
    WHERE status = 'published' AND published_at <= now()
    ORDER BY published_at DESC
  `) as Row[];

  return rows.map((row) => ({
    slug: row.slug,
    publishedAt: new Date(row.published_at ?? Date.now()),
  }));
}

// ---------------------------------------------------------------------------
// Admin reads and writes. Separately named on purpose: nothing below filters by
// status, so every caller must be behind requireAdmin().
// ---------------------------------------------------------------------------

export async function listAllPosts(): Promise<Post[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id, p.slug, p.title, p.excerpt, p.body, p.tags, p.status, p.pinned,
           p.reading_minutes, p.published_at, p.created_at, p.updated_at,
           (SELECT count(*) FROM post_reactions r
             WHERE r.post_id = p.id AND r.active)::int AS like_count,
           (SELECT count(*) FROM post_comments c
             WHERE c.post_id = p.id AND c.status = 'visible')::int AS comment_count
    FROM posts p
    ORDER BY p.pinned DESC, COALESCE(p.published_at, p.created_at) DESC
  `) as Row[];

  return rows.map(toPost);
}

export async function getPostForAdmin(id: string): Promise<Post | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id, p.slug, p.title, p.excerpt, p.body, p.tags, p.status, p.pinned,
           p.reading_minutes, p.published_at, p.created_at, p.updated_at,
           (SELECT count(*) FROM post_reactions r
             WHERE r.post_id = p.id AND r.active)::int AS like_count,
           (SELECT count(*) FROM post_comments c
             WHERE c.post_id = p.id AND c.status = 'visible')::int AS comment_count
    FROM posts p
    WHERE p.id = ${id}
  `) as Row[];

  return rows[0] ? toPost(rows[0]) : null;
}

export async function createPost(input: {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  tags: string[];
  readingMinutes: number;
}): Promise<{ id: string; slug: string }> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO posts (slug, title, body, excerpt, tags, reading_minutes)
    VALUES (${input.slug}, ${input.title}, ${input.body}, ${input.excerpt},
            ${input.tags}, ${input.readingMinutes})
    RETURNING id, slug
  `) as { id: string; slug: string }[];

  return rows[0];
}

/** Returns null when no row matched, which the route turns into a 404. */
export async function updatePost(
  id: string,
  input: {
    slug: string;
    title: string;
    body: string;
    excerpt: string;
    tags: string[];
    readingMinutes: number;
  },
): Promise<{ id: string; slug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE posts SET
      slug = ${input.slug},
      title = ${input.title},
      body = ${input.body},
      excerpt = ${input.excerpt},
      tags = ${input.tags},
      reading_minutes = ${input.readingMinutes},
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, slug
  `) as { id: string; slug: string }[];

  return rows[0] ?? null;
}

/**
 * Publish, idempotently.
 *
 * `COALESCE` keeps the original date if the post was published before, so
 * unpublishing and republishing does not move it to the top of the feed, and a
 * double-clicked button cannot either.
 */
export async function publishPost(
  id: string,
): Promise<{ id: string; slug: string; publishedAt: Date } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE posts SET
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, slug, published_at
  `) as { id: string; slug: string; published_at: string }[];

  const row = rows[0];
  return row
    ? { id: row.id, slug: row.slug, publishedAt: new Date(row.published_at) }
    : null;
}

/**
 * Back to draft.
 *
 * `published_at` is kept, not cleared. The schema's CHECK only requires a date
 * when published, and keeping it means a re-publish restores the post to its
 * original place in the feed rather than jumping the queue.
 */
export async function unpublishPost(
  id: string,
): Promise<{ id: string; slug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE posts SET status = 'draft', updated_at = now()
    WHERE id = ${id}
    RETURNING id, slug
  `) as { id: string; slug: string }[];

  return rows[0] ?? null;
}

/**
 * Pin one post, unpinning whatever was pinned before — in a single statement.
 *
 * `pinned = (id = $1)` evaluates per row, so the incumbent is unpinned and the
 * target pinned atomically. The `WHERE` keeps it to the two rows that can change.
 * With `pinned` passed false it simply unpins the target.
 */
export async function setPinnedPost(
  id: string,
  pinned: boolean,
): Promise<{ id: string; slug: string; pinned: boolean }[]> {
  const sql = getSql();

  const rows = (pinned
    ? await sql`
        UPDATE posts SET pinned = (id = ${id}), updated_at = now()
        WHERE pinned OR id = ${id}
        RETURNING id, slug, pinned
      `
    : await sql`
        UPDATE posts SET pinned = FALSE, updated_at = now()
        WHERE id = ${id}
        RETURNING id, slug, pinned
      `) as { id: string; slug: string; pinned: boolean }[];

  return rows;
}

/** Comments and reactions go with it, by ON DELETE CASCADE. */
export async function deletePost(
  id: string,
): Promise<{ id: string; slug: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM posts WHERE id = ${id} RETURNING id, slug
  `) as { id: string; slug: string }[];

  return rows[0] ?? null;
}

/** Counts for the admin dashboard. */
export async function countPostsByStatus(): Promise<{
  draft: number;
  published: number;
}> {
  const sql = getSql();
  const rows = (await sql`
    SELECT status, count(*)::int AS n FROM posts GROUP BY status
  `) as { status: string; n: number }[];

  return {
    draft: rows.find((row) => row.status === "draft")?.n ?? 0,
    published: rows.find((row) => row.status === "published")?.n ?? 0,
  };
}
