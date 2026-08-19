import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The admin post endpoints.
 *
 * The central assertion is not that a refusal returns the right status — it is
 * that **the data layer is never reached on a refusal**. That is what proves
 * authorization runs before the work rather than beside it, and it is the one
 * property a careless refactor is most likely to break while every status-code
 * test keeps passing.
 *
 * Also asserted: a refusal is a 404 rather than a 403, so nothing confirms that
 * the admin API exists; and no response body carries SQL, a table name or a
 * stack trace.
 */

const requireAdmin = vi.hoisted(() => vi.fn());
const listAllPosts = vi.hoisted(() => vi.fn());
const createPost = vi.hoisted(() => vi.fn());
const revalidateFeed = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireAdmin }));
vi.mock("@/lib/db/posts", () => ({ listAllPosts, createPost }));
vi.mock("@/lib/blog/invalidate", () => ({
  revalidateFeed,
  revalidatePost: vi.fn(),
  revalidateThread: vi.fn(),
}));

const SITE = "https://example.test";

beforeEach(() => {
  vi.resetModules();
  requireAdmin.mockReset();
  listAllPosts.mockReset();
  createPost.mockReset();
  revalidateFeed.mockReset();
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});

async function load() {
  return import("./route");
}

const admin = () => ({ ok: true, user: { id: "owner", isAdmin: true } });
const refused = () => ({ ok: false, status: 404 as const });

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${SITE}/api/admin/posts`, {
    method: "POST",
    headers: { origin: SITE, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPost = {
  title: "A post",
  slug: "a-post",
  body: "Some words worth reading.",
  excerpt: "",
  tags: ["one"],
};

describe("authorization", () => {
  it("refuses a non-administrator without touching the database", async () => {
    requireAdmin.mockResolvedValue(refused());
    const { GET, POST } = await load();

    const listed = await GET(new Request(`${SITE}/api/admin/posts`));
    const created = await POST(post(validPost));

    expect(listed.status).toBe(404);
    expect(created.status).toBe(404);
    // The whole point of this file.
    expect(listAllPosts).not.toHaveBeenCalled();
    expect(createPost).not.toHaveBeenCalled();
  });

  it("refuses with 404 rather than 403, so nothing is confirmed to exist", async () => {
    requireAdmin.mockResolvedValue(refused());
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/admin/posts`));

    expect(response.status).toBe(404);
    expect(response.status).not.toBe(403);
  });

  it("checks authorization before the body is even parsed", async () => {
    requireAdmin.mockResolvedValue(refused());
    const { POST } = await load();

    // Malformed JSON *and* unauthorised. A 404 rather than a 400 shows which
    // check ran first.
    const response = await POST(
      new Request(`${SITE}/api/admin/posts`, {
        method: "POST",
        headers: { origin: SITE, "content-type": "application/json" },
        body: "{not json",
      }),
    );

    expect(response.status).toBe(404);
    expect(createPost).not.toHaveBeenCalled();
  });
});

describe("request validation", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(admin());
  });

  it("rejects a cross-origin submission", async () => {
    const { POST } = await load();
    const response = await POST(post(validPost, { origin: "https://attacker.test" }));

    expect(response.status).toBe(400);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("rejects a form-encoded submission", async () => {
    const { POST } = await load();
    const response = await POST(
      new Request(`${SITE}/api/admin/posts`, {
        method: "POST",
        headers: { origin: SITE, "content-type": "application/x-www-form-urlencoded" },
        body: "slug=x",
      }),
    );

    expect(response.status).toBe(400);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid slug", async () => {
    const { POST } = await load();
    const response = await POST(post({ ...validPost, slug: "Not A Slug" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.fieldErrors.slug).toBeDefined();
    expect(createPost).not.toHaveBeenCalled();
  });

  it("ignores a status field, so a save cannot publish", async () => {
    createPost.mockResolvedValue({ id: "p1", slug: "a-post" });
    const { POST } = await load();

    await POST(post({ ...validPost, status: "published", pinned: true }));

    // zod strips unknown keys, so these never reach the data layer at all.
    const [arg] = createPost.mock.calls[0];
    expect(arg).not.toHaveProperty("status");
    expect(arg).not.toHaveProperty("pinned");
  });

  it("derives an excerpt and a reading time when none is given", async () => {
    createPost.mockResolvedValue({ id: "p1", slug: "a-post" });
    const { POST } = await load();

    await POST(post({ ...validPost, body: "word ".repeat(400), excerpt: "" }));

    const [arg] = createPost.mock.calls[0];
    expect(arg.excerpt.length).toBeGreaterThan(0);
    expect(arg.readingMinutes).toBe(2);
  });

  it("keeps an author-written excerpt", async () => {
    createPost.mockResolvedValue({ id: "p1", slug: "a-post" });
    const { POST } = await load();

    await POST(post({ ...validPost, excerpt: "My own teaser." }));

    expect(createPost.mock.calls[0][0].excerpt).toBe("My own teaser.");
  });
});

describe("failure handling", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(admin());
  });

  it("turns a duplicate slug into a field error", async () => {
    createPost.mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));
    const { POST } = await load();

    const response = await POST(post(validPost));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.fieldErrors.slug).toBeDefined();
  });

  it("never leaks SQL, a table name or a stack trace", async () => {
    listAllPosts.mockRejectedValue(
      new Error('syntax error at or near "SELECT" — relation posts'),
    );
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/admin/posts`));
    const text = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(text).not.toContain("SELECT");
    expect(text).not.toContain("posts");
    expect(text).not.toContain("relation");
  });

  it("sets no-store on every response", async () => {
    listAllPosts.mockResolvedValue([]);
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/admin/posts`));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("success", () => {
  it("creates a draft and invalidates the feed", async () => {
    requireAdmin.mockResolvedValue(admin());
    createPost.mockResolvedValue({ id: "p1", slug: "a-post" });
    const { POST } = await load();

    const response = await POST(post(validPost));

    expect(response.status).toBe(201);
    expect(revalidateFeed).toHaveBeenCalled();
  });
});
