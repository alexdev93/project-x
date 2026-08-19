import { unstable_cache } from "next/cache";
import { getBlogConfig, hasBlog } from "./config";
import {
  listPublishedPosts,
  listPublishedSlugs,
  listRecentPosts,
  getPublishedPost,
} from "@/lib/db/posts";
import { listThread } from "@/lib/db/comments";
import type { CommentNode, Page, Post, PostSummary } from "./types";

/**
 * The read layer the pages use, and the only place a database failure is
 * swallowed.
 *
 * The data modules deliberately do not catch (see the note in knowledge.ts);
 * resilience policy belongs here, one layer up, exactly as src/lib/rag/retrieval
 * handles it for the assistant. The policy for the blog is the same as the
 * policy for the rest of the site: **a missing or sleeping database degrades a
 * section, it never breaks a page.** Free-tier Postgres autosuspends, so "the
 * database is asleep" is a normal condition rather than an incident.
 *
 * Every function therefore returns an empty result on failure and logs the
 * reason server-side. A page that renders an empty feed is a far better outcome
 * than a page that 500s, and it is what keeps `/blog` unconditional in the
 * navigation.
 */

/**
 * Put the Dates back after a cached read.
 *
 * `unstable_cache` round-trips its value through JSON, so every `Date` the data
 * layer produced comes back as an ISO **string** — with the type still claiming
 * `Date`, because the cache wrapper is generic over whatever it was given. The
 * symptom is a `toISOString is not a function` crash at render time, on the
 * *second* request rather than the first, which is a genuinely nasty thing to
 * debug in production.
 *
 * So every value that crosses the cache boundary is revived here, and the domain
 * types stay honest: a `PostSummary` always holds real `Date`s, whatever path it
 * arrived by.
 */
function reviveDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

function revivePost<T extends PostSummary>(post: T): T {
  return {
    ...post,
    publishedAt: reviveDate(post.publishedAt),
    ...("createdAt" in post
      ? {
          createdAt: reviveDate((post as unknown as Post).createdAt) as Date,
          updatedAt: reviveDate((post as unknown as Post).updatedAt) as Date,
        }
      : {}),
  };
}

function warn(what: string, error: unknown): void {
  // Server-side only, and never in a response body. The message is enough to
  // diagnose from function logs without leaking anything to a visitor.
  console.error(
    `[blog] ${what} failed:`,
    error instanceof Error ? error.message : error,
  );
}

const EMPTY_PAGE: Page<PostSummary> = {
  items: [],
  total: 0,
  page: 1,
  pageCount: 1,
};

/** Cache tags. Named in one place so an invalidation cannot miss a reader. */
export const POSTS_TAG = "posts";
export const postTag = (slug: string) => `post:${slug}`;
export const threadTag = (slug: string) => `post-comments:${slug}`;

/**
 * The feed, cached and tagged.
 *
 * `unstable_cache` rather than a bare read so publishing can invalidate it by
 * tag immediately, instead of the page waiting out its ISR window. Nothing
 * session-dependent goes through here — a per-visitor value in a shared cache is
 * the quietest possible way to leak one reader's state to another.
 */
export async function getFeed(page: number): Promise<Page<PostSummary>> {
  if (!hasBlog()) return { ...EMPTY_PAGE, page };

  const { pageSize } = getBlogConfig();

  const read = unstable_cache(
    async (requested: number) =>
      listPublishedPosts({
        limit: pageSize,
        offset: (requested - 1) * pageSize,
        page: requested,
      }),
    ["blog", "feed"],
    { tags: [POSTS_TAG] },
  );

  try {
    const result = await read(page);
    return { ...result, items: result.items.map(revivePost) };
  } catch (error) {
    warn("feed", error);
    return { ...EMPTY_PAGE, page };
  }
}

export async function getRecent(): Promise<PostSummary[]> {
  if (!hasBlog()) return [];

  const { homeCount } = getBlogConfig();

  const read = unstable_cache(
    async (limit: number) => listRecentPosts(limit),
    ["blog", "recent"],
    { tags: [POSTS_TAG] },
  );

  try {
    return (await read(homeCount)).map(revivePost);
  } catch (error) {
    warn("recent posts", error);
    return [];
  }
}

/**
 * One post. Null covers all three of "no database", "no such post" and "draft",
 * because the page's response to each is the same 404.
 */
export async function getPost(slug: string): Promise<Post | null> {
  if (!hasBlog()) return null;

  const read = unstable_cache(
    async (requested: string) => getPublishedPost(requested),
    ["blog", "post"],
    { tags: [POSTS_TAG] },
  );

  try {
    const post = await read(slug);
    return post ? revivePost(post) : null;
  } catch (error) {
    warn(`post ${slug}`, error);
    return null;
  }
}

/**
 * Slugs for `generateStaticParams`.
 *
 * Uncached deliberately: it runs at build time, where a cache entry would be
 * meaningless, and an empty list on failure is safe — `dynamicParams` stays on,
 * so a post that was not prerendered is rendered on its first request instead.
 */
export async function getPublishedSlugs(): Promise<
  { slug: string; publishedAt: Date }[]
> {
  if (!hasBlog()) return [];

  try {
    // Uncached, so these are still real Dates — but revived anyway so a future
    // decision to cache this cannot reintroduce the bug quietly.
    return (await listPublishedSlugs()).map((row) => ({
      ...row,
      publishedAt: new Date(row.publishedAt),
    }));
  } catch (error) {
    warn("published slugs", error);
    return [];
  }
}

/**
 * A post's comment thread.
 *
 * `viewerId` widens the read to include that visitor's own pending comments, so
 * this result is **specific to one reader and must not be cached**. It is fetched
 * per request; the post body around it is what carries the cache.
 */
export async function getThread(
  postId: string,
  viewerId: string | null,
): Promise<CommentNode[]> {
  if (!hasBlog()) return [];

  try {
    return await listThread(postId, viewerId);
  } catch (error) {
    warn("thread", error);
    return [];
  }
}
