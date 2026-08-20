import { z } from "zod";
import {
  aiConfigSchema,
  appSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillGroupSchema,
} from "@/content/schema";

/**
 * The editable content files, and the schema each one must satisfy.
 *
 * **The schemas are the same objects `src/content/index.ts` validates with at
 * build time.** That is the whole point of this registry: there is one
 * definition of what a valid profile or project looks like, so an edit accepted
 * here cannot be rejected by the next build. Restating the shapes for the editor
 * would guarantee they drift, and the symptom would be a deploy that fails after
 * a save has already been committed.
 *
 * Two files carry a single object and five carry an array — the schema alone
 * tells the editor and the validator which, since an array schema and an
 * object schema fail `safeParse` differently on the wrong shape.
 */

export type SectionKey =
  | "profile"
  | "experience"
  | "projects"
  | "apps"
  | "skills"
  | "education"
  | "ai";

export type Section = {
  key: SectionKey;
  /** Path within the repository. Also the file the build reads. */
  file: string;
  label: string;
  description: string;
  schema: z.ZodTypeAny;
};

export const SECTIONS: Record<SectionKey, Section> = {
  profile: {
    key: "profile",
    file: "src/content/profile.json",
    label: "Profile",
    description:
      "Your name, role, tagline, summary and contact details. Appears on every page.",
    schema: profileSchema,
  },
  experience: {
    key: "experience",
    file: "src/content/experience.json",
    label: "Experience",
    description: "Roles, dates and what each one involved.",
    schema: z.array(experienceSchema),
  },
  projects: {
    key: "projects",
    file: "src/content/projects.json",
    label: "Projects",
    description: "Case studies, including the long-form chapters.",
    schema: z.array(projectSchema),
  },
  apps: {
    key: "apps",
    file: "src/content/apps.json",
    label: "Apps",
    description: "Downloadable apps, including the download link once one exists.",
    schema: z.array(appSchema),
  },
  skills: {
    key: "skills",
    file: "src/content/skills.json",
    label: "Skills",
    description: "Grouped technologies, with a depth for each.",
    schema: z.array(skillGroupSchema),
  },
  education: {
    key: "education",
    file: "src/content/education.json",
    label: "Education",
    description: "Degrees and certifications.",
    schema: z.array(educationSchema),
  },
  ai: {
    key: "ai",
    file: "src/content/ai.json",
    label: "Assistant",
    description:
      "How the assistant introduces itself, what it will not discuss, and its suggested questions.",
    schema: aiConfigSchema,
  },
};

export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as string[]).includes(value);
}

/**
 * Validate a document against its section's schema.
 *
 * Returns zod's flattened field errors on failure, in the shape the forms in
 * this project already understand. For an array section the errors are keyed by
 * index, which is enough for the editor to say *which* entry is wrong.
 */
export function validateSection(
  key: SectionKey,
  data: unknown,
):
  | { ok: true; data: unknown }
  | { ok: false; message: string; issues: string[] } {
  const result = SECTIONS[key].schema.safeParse(data);

  if (result.success) return { ok: true, data: result.data };

  return {
    ok: false,
    message: "That doesn't match the shape this section needs.",
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
