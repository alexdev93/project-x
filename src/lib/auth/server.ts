import "server-only";

import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";
import { isAdmin } from "./admin";
import { getAuthBaseUrl, getAuthSecret, getGoogleCredentials } from "./config";

/**
 * The Better Auth instance. Google sign-in and nothing else.
 *
 * `server-only` is not decoration: this module holds the OAuth client secret and
 * the cookie-signing secret, so an accidental import from a client component must
 * fail the build rather than be caught in review.
 *
 * ## Why this file constructs a connection pool
 *
 * Everything else in the project talks to Postgres through Neon's HTTP driver
 * (see src/lib/db/client.ts), which is stateless and cannot hold a transaction.
 * Better Auth talks to the database through Kysely, and Kysely's Postgres dialect
 * acquires a client with `pool.connect()`. Neon's `poolQueryViaFetch` shortcut
 * only covers `pool.query()`, so there is no way to serve Kysely over HTTP.
 *
 * Hence a real pool — the one Neon re-exports, which speaks Postgres over a
 * WebSocket — bounded to a single connection and reached only by `/api/auth/*`
 * requests. This is the sole exception to the project's HTTP-only rule, and it is
 * confined to this file so it stays visible.
 *
 * Better Auth 1.7.1 defaults `transaction` to false, which means it issues its
 * writes sequentially. That happens to match the discipline the rest of this
 * codebase already follows for the same underlying reason, so it is left alone.
 *
 * ## Table names
 *
 * Better Auth's default model name is `user`, and `user` is reserved in
 * Postgres — `CREATE TABLE user` is a syntax error, and quoting it at every call
 * site is a permanent papercut. The models are renamed to `auth_*`, which also
 * makes it obvious in a schema dump which tables this library owns.
 *
 * ## Lazy construction
 *
 * The instance is built on first use, not at import. `DATABASE_URL` and the
 * OAuth credentials are optional by design, and a module-scope `betterAuth()`
 * call would turn a missing variable into a build failure instead of a disabled
 * sign-in button.
 */

let instance: ReturnType<typeof create> | null = null;

function create() {
  const secret = getAuthSecret();
  const google = getGoogleCredentials();
  const connectionString = process.env.DATABASE_URL;

  if (!secret || !google || !connectionString) {
    // Callers check `hasAuth()` first; reaching here is a programming error, not
    // a configuration one, so it is worth failing loudly.
    throw new Error("Auth is not configured");
  }

  return betterAuth({
    secret,
    baseURL: getAuthBaseUrl(),
    trustedOrigins: [getAuthBaseUrl()],
    database: new Pool({ connectionString, max: 1, idleTimeoutMillis: 10_000 }),

    // Off by default in this version; set explicitly so an upgrade that flips
    // the default cannot start sending data from this site.
    telemetry: { enabled: false },

    user: { modelName: "auth_user" },
    session: {
      modelName: "auth_session",
      /**
       * A signed copy of the session in the cookie, refreshed every five
       * minutes. Most session reads then cost nothing, which is what makes a
       * one-connection pool comfortable.
       */
      cookieCache: { enabled: true, maxAge: 300 },
    },
    account: {
      modelName: "auth_account",
      /**
       * A no-op today, because Google is the only provider. It is here so that
       * adding a second one later cannot silently enable email-based
       * auto-linking — which would let whoever controls the same address on the
       * other provider take over an existing account. Do not delete this as
       * dead config.
       */
      accountLinking: { enabled: false },
    },
    verification: { modelName: "auth_verification" },

    socialProviders: { google },

    plugins: [
      /**
       * Adds a server-computed `isAdmin` to the session payload so the header
       * can decide whether to render an Admin link. The alternative — a
       * NEXT_PUBLIC_ copy of the allowlist — would publish the owner's email
       * address to every visitor and create a second source of truth.
       *
       * UX only. It decides whether a link is drawn; it never authorises
       * anything. Every admin route re-derives the same answer server-side.
       */
      customSession(async ({ user, session }) => ({
        session,
        user: { ...user, isAdmin: isAdmin(user) },
      })),
    ],
  });
}

export function getAuth() {
  instance ??= create();
  return instance;
}
