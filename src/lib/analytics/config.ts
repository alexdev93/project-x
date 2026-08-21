/**
 * Analytics configuration (PostHog).
 *
 * Both variables are `NEXT_PUBLIC_` on purpose — unlike the AI or auth config,
 * there is no secret here to protect. A PostHog "project API key" is designed
 * to sit in client-side JavaScript; it can only write events into one project,
 * never read them back out. The same is true of every analytics snippet
 * (Google Analytics' measurement ID, Plausible's domain, etc).
 *
 * Optional by design, matching every other feature in this codebase: unset,
 * `hasAnalytics()` is false, `PostHogProvider` renders nothing, and the site
 * is byte-for-byte what it is without this file existing.
 */

/** The PostHog Cloud region this project lives in. Defaults to US. */
const DEFAULT_HOST = "https://us.i.posthog.com";

/**
 * Both accessors read `process.env.NEXT_PUBLIC_*` as a direct, literal member
 * expression — not through a generic `read(name)` helper indexed by a
 * variable. That indirection is exactly what this codebase's other
 * `NEXT_PUBLIC_` reads (`src/lib/site.ts`) avoid, and for a reason that bites
 * silently if missed: Next.js inlines `NEXT_PUBLIC_` variables into the client
 * bundle by statically matching the literal `process.env.NEXT_PUBLIC_X` text
 * at build time. `process.env[name]` is invisible to that step, and there is
 * no real `process.env` in the browser to fall back on — the bracket form
 * would silently read as `undefined` on every client, no error, no signal.
 */

export function getPostHogKey(): string | undefined {
  const value = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return value ? value : undefined;
}

export function getPostHogHost(): string {
  const value = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  return value ? value : DEFAULT_HOST;
}

/** True once a project key is configured. */
export function hasAnalytics(): boolean {
  return Boolean(getPostHogKey());
}
