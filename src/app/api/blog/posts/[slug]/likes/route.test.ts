import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The like endpoints.
 *
 * The properties worth pinning: an anonymous visitor can read a count but not
 * change one, the identity used for a write comes from the session and cannot be
 * supplied by the caller, and a draft is not likeable.
 */

const requireUser = vi.hoisted(() => vi.fn());
const getSessionFromRequest = vi.hoisted(() => vi.fn());
const toggleReaction = vi.hoisted(() => vi.fn());
const getReactionState = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser, getSessionFromRequest }));
vi.mock("@/lib/db/reactions", () => ({ toggleReaction, getReactionState }));

const SITE = "https://example.test";
const params = { params: { slug: "a-post" } };

beforeEach(() => {
  vi.resetModules();
  requireUser.mockReset();
  getSessionFromRequest.mockReset();
  toggleReaction.mockReset();
  getReactionState.mockReset();
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  process.env.DATABASE_URL = "postgres://test";
});

async function load() {
  return import("./route");
}

const signedIn = () => ({
  ok: true,
  user: { id: "user-1", isAdmin: false },
});

function post(headers: Record<string, string> = {}) {
  return new Request(`${SITE}/api/blog/posts/a-post/likes`, {
    method: "POST",
    headers: { origin: SITE, "x-forwarded-host": "example.test", ...headers },
  });
}

describe("GET", () => {
  it("serves a count to an anonymous reader", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    getReactionState.mockResolvedValue({ count: 4, liked: false });
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/blog/posts/a-post/likes`), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ count: 4, liked: false });
    // A signed-out reader has no viewer id, and the query needs no branch for it.
    expect(getReactionState).toHaveBeenCalledWith({ slug: "a-post", viewerId: null });
  });

  it("reports the viewer's own state when signed in", async () => {
    getSessionFromRequest.mockResolvedValue({ id: "user-1" });
    getReactionState.mockResolvedValue({ count: 4, liked: true });
    const { GET } = await load();

    const body = await (
      await GET(new Request(`${SITE}/api/blog/posts/a-post/likes`), params)
    ).json();

    expect(body.liked).toBe(true);
    expect(getReactionState).toHaveBeenCalledWith({ slug: "a-post", viewerId: "user-1" });
  });

  it("404s for a draft or a missing post", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    getReactionState.mockResolvedValue(null);
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/blog/posts/a-draft/likes`), params);

    expect(response.status).toBe(404);
  });

  it("never caches, since the answer differs per reader", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    getReactionState.mockResolvedValue({ count: 0, liked: false });
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/blog/posts/a-post/likes`), params);

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("POST", () => {
  it("refuses an anonymous visitor with 401, not 404", async () => {
    requireUser.mockResolvedValue({ ok: false, status: 401 });
    const { POST } = await load();

    const response = await POST(post(), params);

    expect(response.status).toBe(401);
    // 401 rather than 404 here on purpose: signing in genuinely would fix it,
    // and the post's existence is not a secret — it is a published page.
    expect(toggleReaction).not.toHaveBeenCalled();
  });

  it("takes the author from the session, never from the request", async () => {
    requireUser.mockResolvedValue(signedIn());
    toggleReaction.mockResolvedValue({ active: true });
    getReactionState.mockResolvedValue({ count: 1, liked: true });
    const { POST } = await load();

    await POST(post(), params);

    expect(toggleReaction).toHaveBeenCalledWith({ slug: "a-post", userId: "user-1" });
  });

  it("rejects a cross-origin toggle", async () => {
    requireUser.mockResolvedValue(signedIn());
    const { POST } = await load();

    const response = await POST(
      post({ origin: "https://attacker.test", "x-forwarded-host": "example.test" }),
      params,
    );

    expect(response.status).toBe(400);
    expect(toggleReaction).not.toHaveBeenCalled();
  });

  it("checks the origin before authenticating", async () => {
    requireUser.mockResolvedValue(signedIn());
    const { POST } = await load();

    await POST(post({ origin: "https://attacker.test" }), params);

    // Cheapest rejection first, so an abusive client never reaches a session
    // lookup or the database.
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("404s when the post is not published", async () => {
    requireUser.mockResolvedValue(signedIn());
    toggleReaction.mockResolvedValue(null);
    const { POST } = await load();

    const response = await POST(post(), params);

    expect(response.status).toBe(404);
  });

  it("returns the server's state rather than an assumed one", async () => {
    requireUser.mockResolvedValue(signedIn());
    toggleReaction.mockResolvedValue({ active: false });
    getReactionState.mockResolvedValue({ count: 7, liked: false });
    const { POST } = await load();

    const body = await (await POST(post(), params)).json();

    // The button reconciles against exactly these two values.
    expect(body).toMatchObject({ liked: false, count: 7 });
  });

  it("rate-limits per user and says how long to wait", async () => {
    requireUser.mockResolvedValue(signedIn());
    toggleReaction.mockResolvedValue({ active: true });
    getReactionState.mockResolvedValue({ count: 1, liked: true });
    const { POST } = await load();

    let last: Response | undefined;
    for (let i = 0; i < 35; i += 1) {
      last = await POST(post(), params);
    }

    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});
