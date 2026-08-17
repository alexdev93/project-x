import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTools } from "./tools";
import type { Source } from "@/lib/rag/types";

/**
 * The tool layer is the model's entire capability surface, so these tests care
 * about two things: the tools return what the agent needs to reason with, and
 * they expose nothing beyond the portfolio.
 */

const retrieve = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rag/retrieval", () => ({ retrieve }));

function harness() {
  const collected: Source[] = [];
  const tools = createTools({ add: (s) => collected.push(...s) });
  return { tools, collected };
}

/** The SDK wraps execute; call it the way the runtime does. */
const run = (tool: unknown, input: unknown) =>
  (tool as { execute: (i: unknown, o: unknown) => Promise<unknown> }).execute(
    input,
    { toolCallId: "t", messages: [] },
  );

describe("tool surface", () => {
  it("exposes only the intended tools", () => {
    const { tools } = harness();
    expect(Object.keys(tools).sort()).toEqual([
      "getAbout",
      "getContact",
      "getExperience",
      "getProject",
      "getProjects",
      "getSkills",
      "searchKnowledge",
    ]);
  });

  it("gives no tool a free-form query, path or table parameter", () => {
    // The model must not be able to compose data access; every input is a
    // constrained filter.
    const { tools } = harness();
    const risky = /sql|query$|table|path|file|url|command|eval/i;
    for (const [name, tool] of Object.entries(tools)) {
      const shape = (tool as { inputSchema?: { shape?: object } }).inputSchema?.shape ?? {};
      for (const key of Object.keys(shape)) {
        if (name === "searchKnowledge" && key === "query") continue; // a search phrase, not a query language
        expect(key, `${name}.${key}`).not.toMatch(risky);
      }
    }
  });
});

describe("getProjects", () => {
  it("filters by technology", async () => {
    const { tools } = harness();
    const result = (await run(tools.getProjects, { technology: "kubernetes" })) as {
      count: number;
      projects: { tech: string[] }[];
    };

    expect(result.count).toBeGreaterThan(0);
    for (const project of result.projects) {
      expect(project.tech.join(" ").toLowerCase()).toContain("kubernetes");
    }
  });

  it("returns an empty set for an unknown technology rather than everything", async () => {
    const { tools } = harness();
    const result = (await run(tools.getProjects, {
      technology: "cobol-on-cogs",
    })) as { count: number };
    expect(result.count).toBe(0);
  });

  it("omits unwritten narrative fields and flags the write-up as absent", async () => {
    const { tools } = harness();
    const result = (await run(tools.getProjects, {})) as {
      projects: { problem?: string; caseStudyWritten: boolean }[];
    };

    for (const project of result.projects) {
      expect(project).not.toHaveProperty("problem", "");
      if (!project.caseStudyWritten) expect(project.problem).toBeUndefined();
    }
  });
});

describe("getProject", () => {
  it("returns detail for a known slug", async () => {
    const { tools } = harness();
    const result = (await run(tools.getProject, { slug: "zemenawi-crm" })) as {
      found: boolean;
      project: { name: string; url: string };
    };
    expect(result.found).toBe(true);
    expect(result.project.url).toBe("/projects/zemenawi-crm");
  });

  it("offers valid slugs instead of failing on an unknown one", async () => {
    const { tools } = harness();
    const result = (await run(tools.getProject, { slug: "../../etc/passwd" })) as {
      found: boolean;
      available: unknown[];
    };
    // A bad slug must be inert — no traversal, no error, just a usable hint.
    expect(result.found).toBe(false);
    expect(result.available.length).toBeGreaterThan(0);
  });
});

describe("getExperience", () => {
  it("returns roles newest first with their stack", async () => {
    const { tools } = harness();
    const result = (await run(tools.getExperience, {})) as {
      roles: { company: string; period: string; tech: string[] }[];
    };
    expect(result.roles.length).toBeGreaterThan(0);
    expect(result.roles[0].period).toMatch(/Present|—/);
  });
});

describe("getContact", () => {
  it("returns contact details and nothing sensitive", async () => {
    const { tools } = harness();
    const result = (await run(tools.getContact, {})) as Record<string, unknown>;
    const serialised = JSON.stringify(result);

    expect(result.email).toBeTruthy();
    // Guard against a future edit wiring secrets into a tool response.
    expect(serialised).not.toMatch(/GEMINI|API_KEY|DATABASE_URL|postgres:\/\//i);
  });
});

describe("searchKnowledge", () => {
  beforeEach(() => retrieve.mockReset());

  it("returns results and records their sources for citation", async () => {
    retrieve.mockResolvedValue({
      available: true,
      chunks: [
        {
          content: "# Project: Zemenawi CRM",
          metadata: {
            title: "Zemenawi CRM",
            category: "project",
            url: "/projects/zemenawi-crm",
            source: "projects/zemenawi-crm",
          },
        },
      ],
      sources: [
        { title: "Zemenawi CRM", type: "project", url: "/projects/zemenawi-crm" },
      ],
    });

    const { tools, collected } = harness();
    const result = (await run(tools.searchKnowledge, {
      query: "microservices",
    })) as { available: boolean; results: unknown[] };

    expect(result.available).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(collected).toHaveLength(1);
  });

  it("tells the model search is down instead of implying nothing exists", async () => {
    // An empty list would read as "there is nothing about this", which is a
    // very different and wrong answer.
    retrieve.mockResolvedValue({ available: false, chunks: [], sources: [] });

    const { tools } = harness();
    const result = (await run(tools.searchKnowledge, { query: "kubernetes" })) as {
      available: boolean;
      note: string;
    };

    expect(result.available).toBe(false);
    expect(result.note).toMatch(/unavailable/i);
  });

  it("passes a category filter through", async () => {
    retrieve.mockResolvedValue({ available: true, chunks: [], sources: [] });
    const { tools } = harness();

    await run(tools.searchKnowledge, { query: "q", category: "experience" });

    expect(retrieve).toHaveBeenCalledWith("q", { category: "experience" });
  });
});
