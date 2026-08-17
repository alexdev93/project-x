import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Retrieval is best-effort by design: it powers citations, not the answer. These
 * tests pin that contract, because a regression here would turn a cold database
 * into a broken assistant.
 *
 * Gemini and Postgres are both mocked. Nothing here makes a network call.
 */

const embedQuery = vi.hoisted(() => vi.fn());
const searchChunks = vi.hoisted(() => vi.fn());

vi.mock("./embeddings", () => ({
  embedQuery,
  EmbeddingError: class EmbeddingError extends Error {},
}));
vi.mock("@/lib/db/knowledge", () => ({ searchChunks }));

const chunk = (title: string, url: string, score: number) => ({
  id: `${url}#0`,
  content: `# ${title}`,
  contentHash: "h",
  metadata: { source: url.slice(1), category: "project" as const, title, url },
  score,
});

describe("retrieve", () => {
  beforeEach(() => {
    vi.resetModules();
    embedQuery.mockReset();
    searchChunks.mockReset();
    process.env.DATABASE_URL = "postgres://test";
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  async function load() {
    return (await import("./retrieval")).retrieve;
  }

  it("returns chunks and public sources on success", async () => {
    embedQuery.mockResolvedValue([0.1, 0.2]);
    searchChunks.mockResolvedValue([chunk("Zemenawi CRM", "/projects/z", 0.9)]);

    const result = await (await load())("microservices");

    expect(result.available).toBe(true);
    expect(result.chunks).toHaveLength(1);
    expect(result.sources).toEqual([
      { title: "Zemenawi CRM", type: "project", url: "/projects/z" },
    ]);
  });

  it("never leaks ids, hashes or scores into sources", async () => {
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([chunk("A", "/projects/a", 0.8)]);

    const { sources } = await (await load())("q");
    for (const source of sources) {
      expect(Object.keys(source).sort()).toEqual(["title", "type", "url"]);
    }
  });

  it("deduplicates sources that share a destination", async () => {
    // Five skill groups all link to /about; citing it five times is noise.
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([
      chunk("Backend skills", "/about", 0.9),
      chunk("Platform skills", "/about", 0.8),
    ]);

    const { sources } = await (await load())("skills");
    expect(sources).toHaveLength(1);
  });

  it("skips retrieval entirely when no database is configured", async () => {
    delete process.env.DATABASE_URL;

    const result = await (await load())("q");

    expect(result.available).toBe(false);
    expect(result.sources).toEqual([]);
    expect(embedQuery).not.toHaveBeenCalled();
  });

  it("degrades quietly when embedding fails", async () => {
    embedQuery.mockRejectedValue(new Error("quota exhausted"));

    const result = await (await load())("q");

    expect(result.available).toBe(false);
    expect(result.chunks).toEqual([]);
  });

  it("degrades quietly when the database is unreachable", async () => {
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await (await load())("q");
    expect(result.available).toBe(false);
  });

  it("gives up rather than blocking on a sleeping database", async () => {
    // Free-tier Postgres autosuspends, so a slow cold start is routine. The
    // answer must not wait on it.
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
    );

    const started = Date.now();
    const result = await (await load())("q", { timeoutMs: 50 });

    expect(result.available).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("ignores an empty query without calling out", async () => {
    const result = await (await load())("   ");
    expect(result.available).toBe(false);
    expect(embedQuery).not.toHaveBeenCalled();
  });

  it("passes topK and category through to the store", async () => {
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([]);

    await (await load())("q", { topK: 3, category: "experience" });

    expect(searchChunks).toHaveBeenCalledWith(
      [0.1],
      expect.objectContaining({ topK: 3, category: "experience" }),
    );
  });
});
