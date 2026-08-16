import { z } from "zod";

/**
 * Schemas for everything under src/content.
 *
 * These are the single source of truth for both the runtime shape and the
 * TypeScript types. They run at import time, which for statically generated
 * pages means at build time — so a malformed content file fails the build
 * rather than rendering a broken page in production.
 */

/** `YYYY-MM`. Used instead of a full date because month precision is all a CV needs. */
const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a YYYY-MM date");

const url = z.string().url();
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a kebab-case slug");

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export const socialLinkSchema = z.object({
  /** Matched against an icon map in the UI. */
  platform: z.enum(["github", "linkedin", "email", "phone", "x", "website"]),
  label: z.string().min(1),
  href: z.string().min(1),
});

export const profileSchema = z.object({
  /** Full legal name — used for metadata, structured data and the footer. */
  name: z.string().min(1),
  /** Short form used in running copy and by the AI assistant. */
  shortName: z.string().min(1),
  /** How the name is presented in the hero. */
  displayName: z.string().min(1),
  /** One line under the name. Keep it under ~60 characters. */
  role: z.string().min(1),
  /** The positioning statement. One or two sentences, no buzzwords. */
  tagline: z.string().min(1),
  /** Longer bio, one string per paragraph. */
  bio: z.array(z.string().min(1)).min(1),
  /** Short list of what he actually does, for the home page. */
  focusAreas: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  location: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  /** Path under /public. */
  avatar: z.string().min(1),
  resume: z.object({
    /** Path under /public. */
    href: z.string().min(1),
    label: z.string().min(1),
  }),
  availability: z.object({
    open: z.boolean(),
    message: z.string().min(1),
  }),
  socials: z.array(socialLinkSchema).min(1),
});

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

export const experienceSchema = z.object({
  id: slug,
  company: z.string().min(1),
  title: z.string().min(1),
  /** Distinguishes a staff role from an internship or training programme. */
  kind: z.enum(["employment", "internship", "training", "freelance"]),
  location: z.string().min(1).optional(),
  start: yearMonth,
  /** null means the role is current. */
  end: yearMonth.nullable(),
  summary: z.string().min(1),
  /** Concrete contributions. Prefer outcomes over responsibilities. */
  highlights: z.array(z.string().min(1)).min(1),
  tech: z.array(z.string().min(1)),
});

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Narrative fields default to an empty string. Empty means "not written yet"
 * and the UI omits the block entirely rather than rendering a stub, so an
 * unfinished case study still looks deliberate.
 */
const narrative = z.string().default("");

export const projectSchema = z.object({
  slug,
  name: z.string().min(1),
  /** One line for cards and search results. */
  summary: z.string().min(1),
  /** Groups projects on the index page. */
  category: z.enum([
    "distributed-systems",
    "backend",
    "full-stack",
    "ai",
    "infrastructure",
  ]),
  /** Controls ordering and what appears on the home page. Higher wins. */
  weight: z.number().int().default(0),
  featured: z.boolean().default(false),
  year: z.string().min(1),
  role: z.string().min(1),
  tech: z.array(z.string().min(1)).min(1),
  repo: z
    .object({
      /** Private repos render a lock badge instead of a link. */
      visibility: z.enum(["public", "private"]),
      /** Required when public, ignored when private. */
      href: url.optional(),
      name: z.string().min(1),
    })
    .optional(),
  liveUrl: url.optional(),
  /** Long-form case study. Any empty field is skipped by the UI. */
  problem: narrative,
  approach: narrative,
  architecture: narrative,
  outcome: narrative,
  /** Named decisions with the reasoning behind them. */
  decisions: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
      }),
    )
    .default([]),
  /** Services or modules, for multi-repo systems. */
  components: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .default([]),
});

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately not a percentage. A self-assigned "95%" is unverifiable and
 * reads as template filler; depth bands map to how the work is actually used.
 */
export const skillDepth = z.enum(["core", "working", "familiar"]);

export const skillGroupSchema = z.object({
  id: slug,
  title: z.string().min(1),
  description: z.string().min(1),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        depth: skillDepth,
      }),
    )
    .min(1),
});

/* -------------------------------------------------------------------------- */
/* Education                                                                  */
/* -------------------------------------------------------------------------- */

export const educationSchema = z.object({
  id: slug,
  institution: z.string().min(1),
  credential: z.string().min(1),
  year: z.string().min(1),
  kind: z.enum(["degree", "certification", "programme"]),
  detail: z.string().default(""),
});

/* -------------------------------------------------------------------------- */
/* AI assistant                                                               */
/* -------------------------------------------------------------------------- */

export const aiConfigSchema = z.object({
  /** Shown in the chat empty state. */
  greeting: z.string().min(1),
  intro: z.string().min(1),
  suggestedPrompts: z.array(z.string().min(1)).min(1),
  /** Injected into the system prompt to shape tone. */
  persona: z.object({
    voice: z.string().min(1),
    rules: z.array(z.string().min(1)).min(1),
  }),
});

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type SocialLink = z.infer<typeof socialLinkSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectCategory = Project["category"];
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type SkillDepth = z.infer<typeof skillDepth>;
export type Education = z.infer<typeof educationSchema>;
export type AiConfig = z.infer<typeof aiConfigSchema>;
