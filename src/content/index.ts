import { z } from "zod";
import aiJson from "./ai.json";
import educationJson from "./education.json";
import experienceJson from "./experience.json";
import profileJson from "./profile.json";
import projectsJson from "./projects.json";
import skillsJson from "./skills.json";
import {
  aiConfigSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillGroupSchema,
  type Experience,
  type Project,
  type ProjectCategory,
} from "./schema";

/**
 * Validated content accessors.
 *
 * The JSON is imported at module scope, so Next inlines it at build time and
 * every content page renders statically with no runtime fetch. Validation runs
 * once per build; a malformed file fails the build with a path to the problem
 * rather than shipping a broken page.
 */

function parse<T>(schema: z.ZodType<T>, data: unknown, source: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid content in src/content/${source}:\n${issues}`);
  }

  return result.data;
}

export const profile = parse(profileSchema, profileJson, "profile.json");

export const experiences = parse(
  z.array(experienceSchema),
  experienceJson,
  "experience.json",
)
  // Most recent first. Current roles (end === null) sort above finished ones.
  .slice()
  .sort((a, b) => b.start.localeCompare(a.start));

export const projects = parse(
  z.array(projectSchema),
  projectsJson,
  "projects.json",
)
  .slice()
  .sort((a, b) => b.weight - a.weight);

export const skillGroups = parse(
  z.array(skillGroupSchema),
  skillsJson,
  "skills.json",
);

export const education = parse(
  z.array(educationSchema),
  educationJson,
  "education.json",
);

export const aiConfig = parse(aiConfigSchema, aiJson, "ai.json");

/* -------------------------------------------------------------------------- */
/* Derived helpers                                                            */
/* -------------------------------------------------------------------------- */

export const featuredProjects = projects.filter((project) => project.featured);

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function getProjectSlugs(): string[] {
  return projects.map((project) => project.slug);
}

const categoryLabels: Record<ProjectCategory, string> = {
  "distributed-systems": "Distributed systems",
  backend: "Backend",
  "full-stack": "Full-stack",
  ai: "AI",
  infrastructure: "Infrastructure",
};

export function projectCategoryLabel(category: ProjectCategory): string {
  return categoryLabels[category];
}

/** True when the case study has any long-form content written yet. */
export function hasCaseStudy(project: Project): boolean {
  return Boolean(
    project.problem ||
      project.approach ||
      project.architecture ||
      project.outcome ||
      project.decisions.length,
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2024-03" → "Mar 2024". */
export function formatYearMonth(value: string): string {
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatDateRange(entry: Experience): string {
  const start = formatYearMonth(entry.start);
  return entry.end ? `${start} — ${formatYearMonth(entry.end)}` : `${start} — Present`;
}

/**
 * Facts derived from the content itself, replacing the previous hardcoded
 * counters ("2 Years experience", "15 Customer reviews"). Because these are
 * computed, they cannot drift out of date as experience.json grows.
 */
export type CareerFact = { value: string; label: string };

export function getCareerFacts(now: Date = new Date()): CareerFact[] {
  const earliest = experiences.reduce(
    (min, entry) => (entry.start < min ? entry.start : min),
    experiences[0].start,
  );
  const [startYear, startMonth] = earliest.split("-").map(Number);
  const months =
    (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
  const years = Math.max(1, Math.floor(months / 12));

  const organisations = new Set(
    experiences
      .filter((entry) => entry.kind === "employment" || entry.kind === "internship")
      .map((entry) => entry.company),
  );

  const technologies = new Set(
    experiences.flatMap((entry) => entry.tech),
  );

  const services = projects
    .filter((project) => project.category === "distributed-systems")
    .reduce((total, project) => total + project.components.length, 0);

  const facts: CareerFact[] = [
    { value: `${years}+`, label: "Years building software" },
    { value: String(organisations.size), label: "Companies and teams" },
    { value: String(technologies.size), label: "Technologies shipped with" },
  ];

  if (services > 0) {
    facts.push({ value: String(services), label: "Services in one platform" });
  }

  return facts;
}

export * from "./schema";
