import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Posting comments and replies.
 *
 * The assertions that matter are about *what reaches the data layer*: the author
 * is the session's user and nothing else, a supplied `status` cannot publish a
 * comment past moderation, and a reply carries only its parent — never a post id
 * the caller chose.
 */

const requireUser = vi.hoisted(() => vi.fn());
const createComment = vi.hoisted(() => vi.fn());
const createReply = vi.hoisted(() => vi.fn());
const isBlocked = vi.hoisted(() => vi.fn());
const revalidateThread = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser }));
vi.mock("@/lib/db/comments", () => ({ createComment, createReply, isBlocked }));
vi.mock("@/lib/blog/invalidate", () => ({
  revalidateThread,
  revalidateFeed: vi.fn(),
  revalidatePost: vi.fn(),
}));

const SITE = "https://example.test";
const params = { params: { slug: "a-post" } };

beforeEach(() => {
  vi.resetModules();
  requireUser.mockReset();
  createComment.mockReset();
  createReply.mockReset();
  isBlocked.mockReset().mockResolvedValue(false);
  revalidateThread.mockReset();
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  process.env.DATABASE_URL = "postgres://test";
  // A fresh limiter bucket per test would be ideal; instead each test that does
  // not care about limits stays well inside the window.
  delete process.env.BLOG_COMMENT_MODERATION;
});

async function load() {
  return import("./route");
}

const signedIn = (id = "user-1") => ({ ok: true, user: { id, isAdmin: false } });

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${SITE}/api/blog/posts/a-post/comments`, {
    method: "POST",
    headers: {
      origin: SITE,
      "x-forwarded-host": "example.test",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("authorization", () => {
  it("refuses an anonymous visitor with 401", async () => {
    requireUser.mockResolvedValue({ ok: false, status: 401 });
    const { POST } = await load();

    const response = await POST(post({ body: "hello there" }), params);

    expect(response.status).toBe(401);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin comment before authenticating", async () => {
    requireUser.mockResolvedValue(signedIn());
    const { POST } = await load();

    const response = await POST(
      post({ body: "hello there" }, { origin: "https://attacker.test" }),
      params,
    );

    expect(response.status).toBe(400);
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("refuses a blocked reader without saying why", async () => {
    requireUser.mockResolvedValue(signedIn("blocked-user"));
    isBlocked.mockResolvedValue(true);
    const { POST } = await load();

    const response = await POST(post({ body: "hello there" }), params);
    const text = JSON.stringify(await response.json());

    expect(response.status).toBe(403);
    expect(createComment).not.toHaveBeenCalled();
    // Telling someone they are blocked invites a second account.
    expect(text.toLowerCase()).not.toContain("block");
  });
});

describe("what reaches the data layer", () => {
  beforeEach(() => {
    requireUser.mockResolvedValue(signedIn());
    createComment.mockResolvedValue({ id: "c1", postId: "p1", status: "visible" });
  });

  it("takes the author from the session, ignoring the body", async () => {
    const { POST } = await load();

    await POST(
      post({
        body: "hello there",
        userId: "someone-else",
        authorName: "Impersonated",
        authorId: "someone-else",
      }),
      params,
    );

    const [arg] = createComment.mock.calls[0];
    expect(arg.userId).toBe("user-1");
    expect(arg).not.toHaveProperty("authorName");
    expect(arg).not.toHaveProperty("authorId");
  });

  it("decides the status by policy, never from the request", async () => {
    const { POST } = await load();

    await POST(post({ body: "hello there", status: "visible" }), params);

    // Under post-moderation an ordinary comment is visible — but because the
    // policy said so, not because the caller asked.
    expect(createComment.mock.calls[0][0].status).toBe("visible");

    createComment.mockClear();
    process.env.BLOG_COMMENT_MODERATION = "pre";
    vi.resetModules();
    const fresh = await load();
    await fresh.POST(post({ body: "hello there", status: "visible" }), params);
    expect(createComment.mock.calls[0][0].status).toBe("pending");
  });

  it("holds a link-heavy comment for approval rather than rejecting it", async () => {
    createComment.mockResolvedValue({ id: "c1", postId: "p1", status: "pending" });
    const { POST } = await load();

    const response = await POST(
      post({ body: "buy at spam.xyz and cheap.top and more.shop" }),
      params,
    );
    const result = await response.json();

    expect(createComment.mock.calls[0][0].status).toBe("pending");
    expect(response.status).toBe(201);
    expect(result.pending).toBe(true);
    // Nothing visible changed, so no page needs rebuilding.
    expect(revalidateThread).not.toHaveBeenCalled();
  });

  it("routes a reply through the parent, not the slug", async () => {
    createReply.mockResolvedValue({ id: "c2", postId: "p1", status: "visible" });
    const { POST } = await load();

    await POST(
      post({
        body: "a reply here",
        parentId: "11111111-1111-4111-8111-111111111111",
      }),
      params,
    );

    expect(createReply).toHaveBeenCalled();
    expect(createComment).not.toHaveBeenCalled();
    const [arg] = createReply.mock.calls[0];
    expect(arg.parentId).toBe("11111111-1111-4111-8111-111111111111");
    // The post is inherited from the parent row inside the statement.
    expect(arg).not.toHaveProperty("slug");
    expect(arg).not.toHaveProperty("postId");
  });

  it("404s when the statement matched nothing", async () => {
    createComment.mockResolvedValue(null);
    const { POST } = await load();

    const response = await POST(post({ body: "hello there" }), params);

    // A draft, a missing post, a reply to a reply — all the same answer.
    expect(response.status).toBe(404);
  });
});

describe("validation", () => {
  beforeEach(() => {
    requireUser.mockResolvedValue(signedIn());
  });

  it("rejects an empty or one-character comment", async () => {
    const { POST } = await load();

    for (const body of ["", " ", "x"]) {
      const response = await POST(post({ body }), params);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(createComment).not.toHaveBeenCalled();
  });

  it("rejects an over-long comment", async () => {
    const { POST } = await load();

    const response = await POST(post({ body: "x".repeat(2500) }), params);

    expect(response.status).toBe(400);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("rejects a parentId that is not an id", async () => {
    const { POST } = await load();

    const response = await POST(
      post({ body: "hello there", parentId: "not-a-uuid" }),
      params,
    );

    expect(response.status).toBe(400);
    expect(createReply).not.toHaveBeenCalled();
  });
});
