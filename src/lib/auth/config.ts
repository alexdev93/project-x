/**
 * Whether authentication is configured, and the values it needs.
 *
 * Same shape as src/lib/ai/config.ts: read the environment through accessors so
 * a missing variable is a *degraded feature* rather than a crash at import time.
 * The blog must stay readable with no auth configured at all — reading never
 * requires a session — so every caller checks `hasAuth()` first.
 *
 * Nothing here is exported to the client. There is no NEXT_PUBLIC_ variable in
 * this feature by design: the sign-in button does not need to know the client id,
 * because the OAuth redirect is built on the server.
 */

import { siteUrl } from "@/lib/site";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getAuthSecret(): string | undefined {
  return read("BETTER_AUTH_SECRET");
}

export function getGoogleCredentials():
  | { clientId: string; clientSecret: string }
  | undefined {
  const clientId = read("GOOGLE_CLIENT_ID");
  const clientSecret = read("GOOGLE_CLIENT_SECRET");
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

/**
 * The base URL Better Auth builds callbacks against.
 *
 * Derived from `siteUrl` rather than a BETTER_AUTH_URL variable of its own. A
 * fourth source of truth for "where does this site live" is a bug waiting for a
 * preview deploy, and `siteUrl` already handles NEXT_PUBLIC_SITE_URL and
 * Vercel's injected production host.
 */
export function getAuthBaseUrl(): string {
  return siteUrl;
}

/**
 * Sign-in requires all three of a secret, Google credentials, and a database —
 * there is nowhere to persist a session without the last one.
 */
export function hasAuth(): boolean {
  return Boolean(
    getAuthSecret() && getGoogleCredentials() && read("DATABASE_URL"),
  );
}

/**
 * Names of the variables that are missing, for a server-side log.
 *
 * Names only, never values. This exists because the single most likely
 * production failure is a variable set in the wrong Vercel scope, and the
 * symptom without it is a silent "sign-in unavailable" with nothing to go on —
 * exactly the diagnosis loop the Gemini key already earned a helper for.
 */
export function missingAuthVars(): string[] {
  const missing: string[] = [];
  if (!getAuthSecret()) missing.push("BETTER_AUTH_SECRET");
  if (!read("GOOGLE_CLIENT_ID")) missing.push("GOOGLE_CLIENT_ID");
  if (!read("GOOGLE_CLIENT_SECRET")) missing.push("GOOGLE_CLIENT_SECRET");
  if (!read("DATABASE_URL")) missing.push("DATABASE_URL");
  return missing;
}
