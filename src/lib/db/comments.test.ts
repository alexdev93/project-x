import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The security properties of the comment queries.
 *
 * These tests assert *statement shape and parameters*, because that is where the
 * authorization actually lives in this design — ownership, the edit window, and
 * whether a post accepts comments are predicates inside the statement, not `if`
 * blocks around it. A test that only checked the return value would pass with
 * every one of those predicates deleted.
 *
 * Postgres is mocked at the driver boundary, exactly as the AI route's tests mock
 * the model. Nothing here opens a connection.
 */

type Captured = { text: string; values: unknown[] };

const captured: Captured[] = [];
let nextRows: unknown[] = [];

/**
 * A stand-in for the driver's tagged template. It records the SQL with its
 * interpolations reduced to `$n` placeholders — which also proves the values
 * travel as parameters rather than being concatenated into the text.
 */
const sql = vi.hoisted(() => {
  return vi.fn();
});

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

const last = () => captured[captured.length - 1];
const normalised = () => last().text.replace(/\s+/g, " ").trim();

describe("listThread", () => {
  it("never selects an email address", async () => {
    const { listThread } = await import("./comments");
    await listThread("post-1", null);

    // The public projection is name and image only. A separate admin function
    // exists for anything that needs more, so no refactor here can widen it.
    expect(normalised()).toContain('u."name"');
    expect(normalised()).toContain('u."image"');
    expect(normalised()).not.toContain("email");
  });

  it("shows visible and withdrawn comments, plus only the viewer's own pending one", async () => {
    const { listThread } = await import("./comments");
    await listThread("post-1", "viewer-1");

    const text = normalised();
    expect(text).toContain("c.status IN ('visible', 'deleted')");
    expect(text).toContain("c.status = 'pending' AND c.user_id = $2");
    expect(last().values).toEqual(["post-1", "viewer-1"]);
  });

  it("groups into exactly two levels", async () => {
    nextRows = [
      row({ id: "a", parent_id: null }),
      row({ id: "b", parent_id: "a" }),
      row({ id: "c", parent_id: null }),
      row({ id: "d", parent_id: "a" }),
    ];

    const { listThread } = await import("./comments");
    const thread = await listThread("post-1", null);

    expect(thread.map((node) => node.id)).toEqual(["a", "c"]);
    expect(thread[0].replies.map((reply) => reply.id)).toEqual(["b", "d"]);
    expect(thread[1].replies).toEqual([]);
  });

  it("blanks the body of a withdrawn comment even if the row still has one", async () => {
    nextRows = [row({ id: "a", parent_id: null, status: "deleted", body: "stale" })];

    const { listThread } = await import("./comments");
    const thread = await listThread("post-1", null);

    expect(thread[0].body).toBe("");
  });
});

describe("createComment", () => {
  it("resolves the post inside the insert, filtered to published", async () => {
    const { createComment } = await import("./comments");
    await createComment({
      slug: "a-post",
      userId: "user-1",
      body: "hello",
      status: "visible",
    });

    const text = normalised();
    // The authorization is the join: a draft or a future-dated post matches
    // nothing, so no separate check exists to be forgotten.
    expect(text).toContain("FROM posts p");
    expect(text).toContain("p.status = 'published'");
    expect(text).toContain("p.published_at <= now()");
    // The slug comes from the client; the post id never does.
    expect(last().values).toContain("a-post");
  });

  it("passes every value as a parameter, never as text", async () => {
    const { createComment } = await import("./comments");
    await createComment({
      slug: "a-post",
      userId: "user-1",
      body: "'; DROP TABLE posts; --",
      status: "visible",
    });

    expect(last().text).not.toContain("DROP TABLE");
    expect(last().values).toContain("'; DROP TABLE posts; --");
  });

  it("returns null when nothing matched, so the route can 404", async () => {
    nextRows = [];
    const { createComment } = await import("./comments");
    const result = await createComment({
      slug: "missing",
      userId: "user-1",
      body: "hello",
      status: "visible",
    });

    expect(result).toBeNull();
  });
});

describe("createReply", () => {
  it("inherits post_id from the parent and refuses a reply to a reply", async () => {
    const { createReply } = await import("./comments");
    await createReply({
      parentId: "comment-1",
      userId: "user-1",
      body: "hello",
      status: "visible",
    });

    const text = normalised();
    // Inheriting post_id is what stops a reply being grafted onto another post.
    expect(text).toContain("SELECT p.post_id, p.id");
    expect(text).toContain("p.parent_id IS NULL");
    expect(text).toContain("p.status = 'visible'");
  });
});

describe("updateOwnComment", () => {
  it("scopes by author and by the edit window in the statement", async () => {
    const { updateOwnComment } = await import("./comments");
    await updateOwnComment({
      id: "comment-1",
      userId: "user-1",
      body: "edited",
      windowMinutes: 15,
    });

    const text = normalised();
    expect(text).toContain("c.user_id = $");
    expect(text).toContain("c.status = 'visible'");
    expect(text).toContain("interval '1 minute'");
    expect(text).toContain("edited_at = now()");
    expect(last().values).toContain("user-1");
    expect(last().values).toContain(15);
  });
});

describe("softDeleteOwnComment", () => {
  it("clears the body in the same statement and stays scoped to the author", async () => {
    const { softDeleteOwnComment } = await import("./comments");
    await softDeleteOwnComment({ id: "comment-1", userId: "user-1" });

    const text = normalised();
    expect(text).toContain("body = ''");
    expect(text).toContain("status = 'deleted'");
    expect(text).toContain("c.user_id = $");
    expect(last().values).toContain("user-1");
  });
});

describe("administrator functions", () => {
  it("hard delete is unscoped, which is why it has its own name", async () => {
    const { deleteCommentAsAdmin } = await import("./comments");
    await deleteCommentAsAdmin("comment-1");

    const text = normalised();
    expect(text).toContain("DELETE FROM post_comments");
    // No user_id predicate here, deliberately — this is only reachable from
    // behind requireAdmin(), and the visitor-facing delete is a different call.
    expect(text).not.toContain("user_id =");
  });

  it("moderation queue puts pending first", async () => {
    const { listCommentsForModeration } = await import("./comments");
    await listCommentsForModeration(50);

    expect(normalised()).toContain("ORDER BY (c.status = 'pending') DESC");
  });
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    parent_id: null,
    user_id: "user-1",
    body: "text",
    status: "visible",
    created_at: "2026-03-15T12:00:00.000Z",
    edited_at: null,
    name: "A Person",
    image: null,
    ...overrides,
  };
}
