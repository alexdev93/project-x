import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentStatus } from "./types";

/**
 * The permission matrix and the moderation decision.
 *
 * These functions do not enforce anything on their own — the SQL predicates in
 * src/lib/db/comments.ts do that — but they decide what the UI offers and what
 * status a route returns, so a regression here is a visible bug even when it is
 * not a hole.
 */

const NOW = new Date("2026-03-15T12:00:00.000Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000);

const comment = (
  overrides: Partial<{
    authorId: string;
    status: CommentStatus;
    createdAt: Date;
  }> = {},
) => ({
  authorId: "user-1",
  status: "visible" as CommentStatus,
  createdAt: minutesAgo(1),
  ...overrides,
});

describe("policy", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.BLOG_COMMENT_MODERATION;
    delete process.env.BLOG_COMMENT_EDIT_WINDOW_MINUTES;
    delete process.env.BLOG_LINK_FLAG_THRESHOLD;
  });

  async function load() {
    return import("./policy");
  }

  describe("canEditComment", () => {
    it("allows the author inside the window", async () => {
      const { canEditComment } = await load();
      expect(canEditComment(comment(), "user-1", NOW)).toBe(true);
    });

    it("refuses everyone else, including an administrator", async () => {
      const { canEditComment } = await load();
      // Editing someone else's words is not an administrative power anywhere in
      // this feature — hiding and deleting are.
      expect(canEditComment(comment(), "user-2", NOW)).toBe(false);
    });

    it("refuses a signed-out reader", async () => {
      const { canEditComment } = await load();
      expect(canEditComment(comment(), null, NOW)).toBe(false);
    });

    it("closes at the window boundary", async () => {
      const { canEditComment } = await load();
      expect(canEditComment(comment({ createdAt: minutesAgo(15) }), "user-1", NOW)).toBe(
        true,
      );
      expect(canEditComment(comment({ createdAt: minutesAgo(16) }), "user-1", NOW)).toBe(
        false,
      );
    });

    it("honours a configured window", async () => {
      process.env.BLOG_COMMENT_EDIT_WINDOW_MINUTES = "60";
      const { canEditComment } = await load();
      expect(canEditComment(comment({ createdAt: minutesAgo(45) }), "user-1", NOW)).toBe(
        true,
      );
    });

    it("refuses anything not currently visible", async () => {
      const { canEditComment } = await load();
      for (const status of ["pending", "hidden", "deleted"] as CommentStatus[]) {
        expect(canEditComment(comment({ status }), "user-1", NOW), status).toBe(false);
      }
    });
  });

  describe("canDeleteComment", () => {
    it("allows the author with no time limit", async () => {
      const { canDeleteComment } = await load();
      expect(
        canDeleteComment(comment({ createdAt: minutesAgo(10_000) }), "user-1"),
      ).toBe(true);
    });

    it("refuses anyone else and refuses a second deletion", async () => {
      const { canDeleteComment } = await load();
      expect(canDeleteComment(comment(), "user-2")).toBe(false);
      expect(canDeleteComment(comment(), null)).toBe(false);
      expect(canDeleteComment(comment({ status: "deleted" }), "user-1")).toBe(false);
    });
  });

  describe("initialCommentStatus", () => {
    it("publishes immediately under post-moderation", async () => {
      const { initialCommentStatus } = await load();
      expect(initialCommentStatus("A normal comment.")).toBe("visible");
    });

    it("holds everything under pre-moderation", async () => {
      process.env.BLOG_COMMENT_MODERATION = "pre";
      const { initialCommentStatus } = await load();
      expect(initialCommentStatus("A normal comment.")).toBe("pending");
    });

    it("holds a link-heavy comment rather than rejecting it", async () => {
      const { initialCommentStatus } = await load();
      expect(
        initialCommentStatus("buy at spam.xyz and cheap.top and more.shop"),
      ).toBe("pending");
    });

    it("lets a single link through", async () => {
      const { initialCommentStatus } = await load();
      expect(initialCommentStatus("Related: https://example.test/post")).toBe("visible");
    });

    it("can have the heuristic disabled", async () => {
      process.env.BLOG_LINK_FLAG_THRESHOLD = "0";
      const { initialCommentStatus } = await load();
      expect(initialCommentStatus("spam.xyz cheap.top more.shop")).toBe("visible");
    });
  });

  describe("isPubliclyVisible", () => {
    it("shows visible and withdrawn comments, hides the rest", async () => {
      const { isPubliclyVisible } = await load();
      // `deleted` stays readable as a tombstone so replies keep their anchor.
      expect(isPubliclyVisible("visible")).toBe(true);
      expect(isPubliclyVisible("deleted")).toBe(true);
      expect(isPubliclyVisible("pending")).toBe(false);
      expect(isPubliclyVisible("hidden")).toBe(false);
    });
  });
});
