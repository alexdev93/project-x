"use client";

import { createAuthClient } from "better-auth/react";

/**
 * The browser side of authentication.
 *
 * Nothing secret reaches here. The client only ever talks to this site's own
 * `/api/auth/*` endpoints, which is why there is no publishable key and no
 * NEXT_PUBLIC_ variable in this feature at all — the OAuth redirect is built
 * server-side.
 *
 * `baseURL` is deliberately omitted so the client uses same-origin relative
 * requests. Hardcoding it would break preview deployments, which live on a
 * different host from production.
 */

export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

/**
 * Kick off Google sign-in, returning to `callbackURL` afterwards.
 *
 * The path is checked before it is used. `/^\/(?!\/)/` requires exactly one
 * leading slash: `//evil.test` is a protocol-relative URL, which a naive
 * `startsWith("/")` accepts and a browser treats as another origin. That is the
 * whole open-redirect class, closed in one place.
 *
 * Resolves `{ error: true }` rather than throwing on a failed request —
 * `signIn.social` itself resolves `{ data, error }` instead of rejecting
 * (Better Auth's client only rejects on a genuine network failure), and a
 * caller that only wraps this in try/catch would never see a 503. This is the
 * one place that needs to know Better Auth's response shape; callers just
 * check `.error`.
 */
export async function signInWithGoogle(callbackURL = "/"): Promise<{ error: boolean }> {
  const safe = /^\/(?!\/)/.test(callbackURL) ? callbackURL : "/";
  const result = await signIn.social({ provider: "google", callbackURL: safe });
  return { error: Boolean(result?.error) };
}
