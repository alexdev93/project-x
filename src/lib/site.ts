import { profile } from "@/content";

/**
 * Site-level configuration that is not editorial content.
 * Anything a reader would call "copy" belongs in src/content instead.
 */

/**
 * Absolute base URL. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on every
 * deployment, so previews and production both resolve without extra config.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const siteName = `${profile.name} — ${profile.role}`;

export type NavItem = { href: string; label: string };

/** Primary navigation, in order. Used by both the header and the footer. */
export const navItems: NavItem[] = [
  { href: "/projects", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/contact", label: "Contact" },
  // "/ai" is added here in the phase that builds the assistant, so the nav
  // never links to a route that does not exist yet.
];

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
