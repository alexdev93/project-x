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

/**
 * Primary navigation, in order. Used by both the header and the footer.
 *
 * "Writing" is listed unconditionally, even though the blog needs a database
 * that is optional by design. This is a module-scope constant imported by client
 * components, so gating it on server configuration would need either a public
 * environment variable or prop-drilling through three components — where
 * rendering an empty state at /blog costs nothing and reads better than a
 * missing menu item.
 */
export const navItems: NavItem[] = [
  { href: "/projects", label: "Work" },
  { href: "/blog", label: "Writing" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/ai", label: "Ask AI" },
  { href: "/contact", label: "Contact" },
];

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
