import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The like toggle is one statement, and the whole point of the design is *which*
 * one. These tests pin that: no delete-then-insert pair, no sibling-CTE trick,
 * and the authoritative new state coming back from the database rather than being
 * assumed by the client.
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

describe("toggleReaction", () => {
  it("is a single statement", async () => {
    const { toggleReaction } = await import("./reactions");
    nextRows = [{ active: true }];

    await toggleReaction({ slug: "a-post", userId: "user-1" });

    // Two statements would mean two round trips with no transaction around them.
    expect(captured).toHaveLength(1);
  });

  it("flips state through ON CONFLICT rather than deleting the row", async () => {
    const { toggleReaction } = await import("./reactions");
    nextRows = [{ active: false }];

    await toggleReaction({ slug: "a-post", userId: "user-1" });

    const text = normalised();
    expect(text).toContain("ON CONFLICT (post_id, user_id)");
    expect(text).toContain("DO UPDATE SET active = NOT post_reactions.active");
    expect(text).not.toContain("DELETE");
  });

  it("returns the authoritative new state for the client to reconcile against", async () => {
    const { toggleReaction } = await import("./reactions");
    nextRows = [{ active: false }];

    const result = await toggleReaction({ slug: "a-post", userId: "user-1" });

    expect(normalised()).toContain("RETURNING active");
    expect(result).toEqual({ active: false });
  });

  it("resolves the post through the published filter, so a draft cannot be liked", async () => {
    const { toggleReaction } = await import("./reactions");
    nextRows = [];

    const result = await toggleReaction({ slug: "a-draft", userId: "user-1" });

    const text = normalised();
    expect(text).toContain("p.status = 'published'");
    expect(text).toContain("p.published_at <= now()");
    // No rows means no such published post, which the route turns into a 404.
    expect(result).toBeNull();
  });
});

describe("getReactionState", () => {
  it("reads the count and the viewer's own state in one round trip", async () => {
    const { getReactionState } = await import("./reactions");
    nextRows = [{ count: 3, liked: true }];

    const state = await getReactionState({ slug: "a-post", viewerId: "user-1" });

    expect(captured).toHaveLength(1);
    expect(state).toEqual({ count: 3, liked: true });
  });

  it("needs no branch for a signed-out reader", async () => {
    const { getReactionState } = await import("./reactions");
    nextRows = [{ count: 3, liked: false }];

    await getReactionState({ slug: "a-post", viewerId: null });

    // user_id = NULL is NULL, never true, so the empty case falls out of the SQL.
    expect(captured[0].values).toContain(null);
    expect(captured).toHaveLength(1);
  });
});
