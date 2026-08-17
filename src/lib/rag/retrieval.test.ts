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

  it("drops matches far weaker than the best one", async () => {
    // A broad question scores half the corpus just above the floor. Citing all
    // of it implies the answer used projects it never mentioned.
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([
      chunk("Focus areas", "/about", 0.759),
      chunk("About", "/about-page", 0.703),
      chunk("This Portfolio", "/projects/portfolio", 0.668),
      chunk("AI Service Work", "/projects/ai-services", 0.667),
      chunk("Zemenawi CRM", "/projects/z", 0.662),
    ]);

    const { sources, chunks } = await (await load())("what does Alex do");

    expect(sources.map((s) => s.title)).toEqual(["Focus areas", "About"]);
    expect(chunks).toHaveLength(2);
  });

  it("keeps every match when they are all close together", async () => {
    // The Kubernetes probe: four chunks within 0.044, all genuinely relevant.
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([
      chunk("Platform & DevOps skills", "/about", 0.731),
      chunk("Container Infrastructure", "/projects/ci", 0.701),
      chunk("Lion International Bank", "/experience", 0.692),
      chunk("Focus areas", "/about-focus", 0.687),
    ]);

    const { sources } = await (await load())("kubernetes and docker");
    expect(sources).toHaveLength(4);
  });

  it("keeps the single best match when nothing else is near it", async () => {
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([
      chunk("Contact", "/contact", 0.687),
      chunk("About", "/about", 0.565),
    ]);

    const { sources } = await (await load())("how do I contact him");
    expect(sources.map((s) => s.title)).toEqual(["Contact"]);
  });

  it("deduplicates sources that share a destination", async () => {
    // Five skill groups all link to /about; citing it five times is noise.
    // Scores are kept within SCORE_MARGIN so both chunks survive the relevance
    // filter and dedup is what actually collapses them.
    embedQuery.mockResolvedValue([0.1]);
    searchChunks.mockResolvedValue([
      chunk("Backend skills", "/about", 0.9),
      chunk("Platform skills", "/about", 0.87),
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
