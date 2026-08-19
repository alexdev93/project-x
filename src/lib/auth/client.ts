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
 */
export function signInWithGoogle(callbackURL = "/"): Promise<unknown> {
  const safe = /^\/(?!\/)/.test(callbackURL) ? callbackURL : "/";
  return signIn.social({ provider: "google", callbackURL: safe });
}
