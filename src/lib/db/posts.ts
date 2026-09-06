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
  cover_image_url?: string | null;
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
    coverImageUrl: row.cover_image_url ?? null,
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
           p.reading_minutes, p.published_at, p.cover_image_url,
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
           p.reading_minutes, p.published_at, p.cover_image_url,
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
           p.reading_minutes, p.published_at, p.created_at, p.updated_at, p.cover_image_url,
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
           p.reading_minutes, p.published_at, p.created_at, p.updated_at, p.cover_image_url,
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
           p.reading_minutes, p.published_at, p.created_at, p.updated_at, p.cover_image_url,
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

/**
 * LinkedIn cross-posting state.
 *
 * Kept out of `Post`/`PostSummary` deliberately — those types flow into the
 * public blog pages, and this is an admin-only sync concern with no reader
 * ever needing it. A dedicated row shape here means adding a LinkedIn field
 * never risks widening what a public page can see.
 */
/** One extra (non-cover) LinkedIn gallery photo. */
export type LinkedInExtraImage = { urn: string; altText: string };

export type LinkedInPostState = {
  slug: string;
  status: PostStatus;
  title: string;
  excerpt: string;
  /** Set once this post has been shared; identifies which LinkedIn post to
   * update or delete on a later edit/unpublish. */
  postUrn: string | null;
  /** The custom LinkedIn caption. Empty/null falls back to the post's
   * title — see lib/linkedin/content.ts. Independent of the blog title on
   * purpose: a LinkedIn caption reads nothing like a blog headline. */
  commentary: string | null;
  /** The post's own cover image — see lib/media/blob.ts — and the LinkedIn
   * image asset uploaded from that same file: the first photo of a real
   * LinkedIn image/multiImage post, not a link-card thumbnail (see
   * lib/linkedin/content.ts). Independent of whether a share has happened. */
  coverImageUrl: string | null;
  coverImageLinkedInUrn: string | null;
  /** Additional gallery photos, in display order, LinkedIn-only — see the
   * schema.sql note on post_linkedin_images for why they have no cover-image
   * equivalent on this site. */
  extraImages: LinkedInExtraImage[];
  /** A document queued for the *next* share, LinkedIn-only — see
   * lib/linkedin/content.ts for why it has no cover-image equivalent. */
  documentUrn: string | null;
};

export async function getLinkedInPostState(
  id: string,
): Promise<LinkedInPostState | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.slug, p.status, p.title, p.excerpt, p.linkedin_post_urn,
           p.linkedin_commentary,
           p.cover_image_url, p.cover_image_linkedin_urn, p.linkedin_document_urn,
           (SELECT COALESCE(json_agg(json_build_object('urn', i.linkedin_urn, 'altText', i.alt_text)
                             ORDER BY i.position), '[]'::json)
             FROM post_linkedin_images i WHERE i.post_id = p.id) AS extra_images
    FROM posts p WHERE p.id = ${id}
  `) as {
    slug: string;
    status: string;
    title: string;
    excerpt: string;
    linkedin_post_urn: string | null;
    linkedin_commentary: string | null;
    cover_image_url: string | null;
    cover_image_linkedin_urn: string | null;
    linkedin_document_urn: string | null;
    extra_images: LinkedInExtraImage[];
  }[];

  const row = rows[0];
  if (!row) return null;

  return {
    slug: row.slug,
    status: row.status as PostStatus,
    title: row.title,
    excerpt: row.excerpt,
    postUrn: row.linkedin_post_urn,
    commentary: row.linkedin_commentary,
    coverImageUrl: row.cover_image_url,
    coverImageLinkedInUrn: row.cover_image_linkedin_urn,
    extraImages: row.extra_images,
    documentUrn: row.linkedin_document_urn,
  };
}

/** Records (or clears, passing `null`) the URN of the post LinkedIn created. */
export async function setLinkedInPostUrn(
  id: string,
  urn: string | null,
): Promise<void> {
  const sql = getSql();
  await sql`UPDATE posts SET linkedin_post_urn = ${urn} WHERE id = ${id}`;
}

/**
 * Sets (or clears, passing `null`) the post's cover image.
 *
 * Clearing it also clears every extra gallery photo: the gallery is always
 * `[cover, ...extras]` (see lib/linkedin/content.ts), so a cover-less post
 * cannot carry extras — they would have no first photo to follow.
 */
export async function setCoverImage(
  id: string,
  cover: { url: string; linkedInUrn: string | null } | null,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE posts SET
      cover_image_url = ${cover?.url ?? null},
      cover_image_linkedin_urn = ${cover?.linkedInUrn ?? null}
    WHERE id = ${id}
  `;
  if (!cover) await sql`DELETE FROM post_linkedin_images WHERE post_id = ${id}`;
}

/** Sets (or clears, passing an empty string) the custom LinkedIn caption. */
export async function setLinkedInCommentary(id: string, commentary: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE posts SET linkedin_commentary = ${commentary || null} WHERE id = ${id}`;
}

/**
 * Replaces the full list of extra (non-cover) gallery photos, in order.
 *
 * Whole-list replacement rather than a single add/remove — the caller
 * always has the current list in hand (see the linkedin-images route), so
 * this can stay one straightforward statement per position instead of
 * position-shifting arithmetic for a removal in the middle. Trims any
 * stale tail first so shrinking the list actually shrinks it.
 */
export async function setLinkedInExtraImages(
  id: string,
  images: LinkedInExtraImage[],
): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM post_linkedin_images WHERE post_id = ${id} AND position >= ${images.length}
  `;
  for (const [position, image] of images.entries()) {
    await sql`
      INSERT INTO post_linkedin_images (post_id, position, linkedin_urn, alt_text)
      VALUES (${id}, ${position}, ${image.urn}, ${image.altText})
      ON CONFLICT (post_id, position)
      DO UPDATE SET linkedin_urn = EXCLUDED.linkedin_urn, alt_text = EXCLUDED.alt_text
    `;
  }
}

/** Sets (or clears, passing `null`) the document queued for the next share. */
export async function setLinkedInDocument(
  id: string,
  urn: string | null,
): Promise<void> {
  const sql = getSql();
  await sql`UPDATE posts SET linkedin_document_urn = ${urn} WHERE id = ${id}`;
}
