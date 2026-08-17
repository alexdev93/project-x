import { tool } from "ai";
import { z } from "zod";
import {
  education,
  experiences,
  formatDateRange,
  getProjectBySlug,
  profile,
  projects,
  skillGroups,
} from "@/content";
import { retrieve } from "@/lib/rag/retrieval";
import type { Source } from "@/lib/rag/types";

/**
 * The agent's tool surface.
 *
 * This is the model's *entire* capability set. Every tool is a typed function
 * over the structured content or the vector search — none of them accepts a
 * query, table name, or filter that the model composes freely, so there is no
 * path from model output to arbitrary data access. Adding a capability means
 * adding a function here deliberately.
 *
 * Tools return compact structured data rather than prose, so the model can
 * compare across results — which is what questions like "which project best
 * demonstrates backend experience" actually require.
 */

/** Collects sources surfaced by searchKnowledge during a single turn. */
export type SourceCollector = { add: (sources: Source[]) => void };

const PROJECT_CATEGORIES = [
  "distributed-systems",
  "backend",
  "full-stack",
  "ai",
  "infrastructure",
] as const;

/** Trimmed project shape. Omits unwritten narrative fields entirely. */
function summariseProject(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) return null;

  return {
    name: project.name,
    slug: project.slug,
    url: `/projects/${project.slug}`,
    category: project.category,
    year: project.year,
    role: project.role,
    summary: project.summary,
    tech: project.tech,
    repository: project.repo
      ? { name: project.repo.name, visibility: project.repo.visibility }
      : undefined,
    // Only present when written, so the model never sees an empty field it
    // might read as "there was no problem to solve".
    problem: project.problem || undefined,
    approach: project.approach || undefined,
    architecture: project.architecture || undefined,
    outcome: project.outcome || undefined,
    decisions: project.decisions.length ? project.decisions : undefined,
    components: project.components.length ? project.components : undefined,
    caseStudyWritten: Boolean(
      project.problem || project.approach || project.architecture || project.outcome,
    ),
  };
}

export function createTools(collector: SourceCollector) {
  return {
    searchKnowledge: tool({
      description:
        "Semantic search across the whole portfolio. Use this first for open " +
        "or comparative questions when you are unsure which section answers it.",
      inputSchema: z.object({
        query: z.string().min(2).max(300).describe("The search phrase."),
        category: z
          .enum(["profile", "experience", "project", "skills", "education", "contact"])
          .optional()
          .describe("Restrict the search to one section."),
      }),
      execute: async ({ query, category }) => {
        const result = await retrieve(query, { category });
        collector.add(result.sources);

        if (!result.available) {
          // Tell the model plainly rather than returning an empty list it might
          // interpret as "nothing exists about this".
          return {
            available: false,
            note:
              "Semantic search is unavailable right now. Answer from the " +
              "portfolio context in the system prompt instead.",
            results: [],
          };
        }

        return {
          available: true,
          results: result.chunks.map((chunk) => ({
            title: chunk.metadata.title,
            category: chunk.metadata.category,
            url: chunk.metadata.url,
            content: chunk.content,
          })),
        };
      },
    }),

    getProjects: tool({
      description:
        "List projects with their stack and role. Use for comparing projects " +
        "or answering 'which project…' questions.",
      inputSchema: z.object({
        category: z.enum(PROJECT_CATEGORIES).optional(),
        technology: z
          .string()
          .max(60)
          .optional()
          .describe("Only projects using this technology, e.g. 'Kubernetes'."),
      }),
      execute: async ({ category, technology }) => {
        const needle = technology?.toLowerCase();
        const matches = projects
          .filter((p) => !category || p.category === category)
          .filter(
            (p) =>
              !needle || p.tech.some((t) => t.toLowerCase().includes(needle)),
          )
          .map((p) => summariseProject(p.slug))
          .filter(Boolean);

        return { count: matches.length, projects: matches };
      },
    }),

    getProject: tool({
      description: "Full detail for one project, by slug.",
      inputSchema: z.object({
        slug: z
          .string()
          .max(80)
          .describe("Project slug, e.g. 'zemenawi-crm'."),
      }),
      execute: async ({ slug }) => {
        const project = summariseProject(slug);
        return project
          ? { found: true, project }
          : {
              found: false,
              available: projects.map((p) => ({ name: p.name, slug: p.slug })),
            };
      },
    }),

    getExperience: tool({
      description:
        "Work history, most recent first, with responsibilities and stack.",
      inputSchema: z.object({
        technology: z
          .string()
          .max(60)
          .optional()
          .describe("Only roles that used this technology."),
      }),
      execute: async ({ technology }) => {
        const needle = technology?.toLowerCase();
        const roles = experiences
          .filter(
            (e) =>
              !needle || e.tech.some((t) => t.toLowerCase().includes(needle)),
          )
          .map((e) => ({
            title: e.title,
            company: e.company,
            period: formatDateRange(e),
            kind: e.kind,
            location: e.location,
            summary: e.summary,
            highlights: e.highlights,
            tech: e.tech,
          }));

        return { count: roles.length, roles, url: "/experience" };
      },
    }),

    getSkills: tool({
      description:
        "Technical skills grouped by area, with depth bands: core (daily, " +
        "owned), working (shipped with), familiar (used, not owned).",
      inputSchema: z.object({}),
      execute: async () => ({
        groups: skillGroups.map((g) => ({
          area: g.title,
          description: g.description,
          skills: g.skills,
        })),
        url: "/about",
      }),
    }),

    getAbout: tool({
      description:
        "Biography, positioning, focus areas, education and availability.",
      inputSchema: z.object({}),
      execute: async () => ({
        name: profile.name,
        knownAs: profile.shortName,
        role: profile.role,
        location: profile.location,
        tagline: profile.tagline,
        bio: profile.bio,
        focusAreas: profile.focusAreas,
        education: education.map((e) => ({
          credential: e.credential,
          institution: e.institution,
          year: e.year,
        })),
        availability: profile.availability,
        url: "/about",
      }),
    }),

    getContact: tool({
      description: "How to reach Alex.",
      inputSchema: z.object({}),
      execute: async () => ({
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        socials: profile.socials.map((s) => ({
          label: s.label,
          href: s.href,
        })),
        contactPage: "/contact",
      }),
    }),
  };
}

export type PortfolioTools = ReturnType<typeof createTools>;
