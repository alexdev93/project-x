import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The invariants of the post queries.
 *
 * Two matter enough to test on every function rather than once: a public read
 * must filter on published, and every UPDATE must set `updated_at`, because the
 * schema deliberately has no trigger to do it. Both are the kind of thing that
 * gets dropped when a query is copied and edited.
 */

type Captured = { text: string; values: unknown[] };

const captured: Captured[] = [];
let nextRows: unknown[] = [];

const sql = vi.hoisted(() => vi.fn());

vi.mock("./client", () => ({
  getSql: () => sql,
  DatabaseNotConfiguredError: class extends Error {},
}));

beforeEach(() => {
  captured.length = 0;
  nextRows = [];
  sql.mockReset();
  sql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
      "",
    );
    captured.push({ text, values });
    return Promise.resolve(nextRows);
  });
});

const normalised = () =>
  captured[captured.length - 1].text.replace(/\s+/g, " ").trim();
const values = () => captured[captured.length - 1].values;

describe("public reads", () => {
  it("filter on published and on the publication date, every one of them", async () => {
    const posts = await import("./posts");

    const reads: Array<() => Promise<unknown>> = [
      () => posts.listPublishedPosts({ limit: 10, offset: 0, page: 1 }),
      () => posts.listRecentPosts(3),
      () => posts.getPublishedPost("a-post"),
      () => posts.listPublishedSlugs(),
    ];

    for (const read of reads) {
      captured.length = 0;
      await read();
      const text = normalised();
      expect(text, text).toContain("status = 'published'");
      // The date filter is what makes a future-dated post scheduled rather than
      // published, so a read missing it would leak posts early.
      expect(text, text).toContain("published_at <= now()");
    }
  });

  it("derives counts rather than reading a stored counter", async () => {
    const { listPublishedPosts } = await import("./posts");
    await listPublishedPosts({ limit: 10, offset: 0, page: 1 });

    const text = normalised();
    expect(text).toContain("FROM post_reactions r");
    expect(text).toContain("FROM post_comments c");
    // A stored counter plus no transactions equals guaranteed drift.
    expect(text).not.toContain("p.like_count");
    expect(text).not.toContain("p.comment_count");
  });

  it("gets the pagination total in the same round trip", async () => {
    const { listPublishedPosts } = await import("./posts");
    nextRows = [{ ...row(), total: 12 }];

    const page = await listPublishedPosts({ limit: 5, offset: 0, page: 1 });

    expect(normalised()).toContain("count(*) OVER ()");
    expect(page.total).toBe(12);
    expect(page.pageCount).toBe(3);
  });

  it("reports one page when there are no posts, not zero", async () => {
    const { listPublishedPosts } = await import("./posts");
    nextRows = [];

    const page = await listPublishedPosts({ limit: 10, offset: 0, page: 1 });

    // Zero would make the pagination component render "page 1 of 0".
    expect(page.pageCount).toBe(1);
    expect(page.items).toEqual([]);
  });
});

describe("admin reads", () => {
  it("are unfiltered, which is why they are named separately", async () => {
    const posts = await import("./posts");

    await posts.listAllPosts();
    expect(normalised()).not.toContain("status = 'published'");

    captured.length = 0;
    await posts.getPostForAdmin("id-1");
    expect(normalised()).not.toContain("status = 'published'");
  });
});

describe("writes", () => {
  it("every UPDATE sets updated_at, since no trigger does", async () => {
    const posts = await import("./posts");

    const updates: Array<() => Promise<unknown>> = [
      () =>
        posts.updatePost("id-1", {
          slug: "s",
          title: "t",
          body: "b",
          excerpt: "e",
          tags: [],
          readingMinutes: 1,
        }),
      () => posts.publishPost("id-1"),
      () => posts.unpublishPost("id-1"),
      () => posts.setPinnedPost("id-1", true),
      () => posts.setPinnedPost("id-1", false),
    ];

    for (const update of updates) {
      captured.length = 0;
      nextRows = [{ id: "id-1", slug: "s", published_at: "2026-01-01T00:00:00Z" }];
      await update();
      const text = normalised();
      expect(text, text).toContain("UPDATE posts");
      expect(text, text).toContain("updated_at = now()");
    }
  });

  it("publish keeps an existing date so a republish does not jump the feed", async () => {
    const { publishPost } = await import("./posts");
    nextRows = [{ id: "id-1", slug: "s", published_at: "2026-01-01T00:00:00Z" }];

    await publishPost("id-1");

    expect(normalised()).toContain("published_at = COALESCE(published_at, now())");
  });

  it("pinning unpins the incumbent in the same statement", async () => {
    const { setPinnedPost } = await import("./posts");
    await setPinnedPost("id-1", true);

    const text = normalised();
    expect(text).toContain("pinned = (id = $1)");
    expect(text).toContain("WHERE pinned OR id = $2");
  });

  it("unpinning touches only the target", async () => {
    const { setPinnedPost } = await import("./posts");
    await setPinnedPost("id-1", false);

    expect(normalised()).toContain("pinned = FALSE");
    expect(values()).toEqual(["id-1"]);
  });

  it("passes hostile input as a parameter", async () => {
    const { createPost } = await import("./posts");
    nextRows = [{ id: "id-1", slug: "s" }];

    await createPost({
      slug: "s",
      title: "'); DROP TABLE posts; --",
      body: "b",
      excerpt: "e",
      tags: [],
      readingMinutes: 1,
    });

    expect(captured[0].text).not.toContain("DROP TABLE");
    expect(captured[0].values).toContain("'); DROP TABLE posts; --");
  });
});

describe("mapping", () => {
  it("narrows an unexpected status to draft rather than casting it", async () => {
    const { getPostForAdmin } = await import("./posts");
    nextRows = [row({ status: "something-else" })];

    const post = await getPostForAdmin("id-1");

    expect(post?.status).toBe("draft");
  });

  it("defaults a null tags array to an empty one", async () => {
    const { getPostForAdmin } = await import("./posts");
    nextRows = [row({ tags: null })];

    const post = await getPostForAdmin("id-1");

    expect(post?.tags).toEqual([]);
  });
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "a-post",
    title: "A post",
    excerpt: "An excerpt",
    body: "Body",
    tags: ["tag"],
    status: "published",
    pinned: false,
    reading_minutes: 2,
    published_at: "2026-03-01T00:00:00.000Z",
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    like_count: 0,
    comment_count: 0,
    ...overrides,
  };
}
