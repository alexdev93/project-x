import "server-only";

import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { customSession, genericOAuth } from "better-auth/plugins";
import { isAdmin } from "./admin";
import {
  getAuthBaseUrl,
  getAuthSecret,
  getGoogleCredentials,
  getLinkedInCredentials,
} from "./config";

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
  const linkedin = getLinkedInCredentials();
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
       * `enabled: false` was the first version of this — measured wrong.
       * Better Auth applies the same flag to *explicit* linking
       * (`/link-social`, what `linkLinkedIn` in client.ts calls) as it does to
       * *implicit* linking, so `enabled: false` also blocked the LinkedIn
       * connect button with "Unable to link account - untrusted provider"
       * (confirmed in the production logs, not guessed).
       *
       * What actually needs to stay off is `disableImplicitLinking`'s
       * scenario: a *new sign-in* auto-attaching to an existing user because
       * it reports the same verified email — that's what would let whoever
       * controls a matching address on another provider take over an
       * existing account. That path is independent of `enabled` and of
       * `trustedProviders`, so it stays disabled here regardless of either.
       *
       * `trustedProviders` + `allowDifferentEmails` only affect the explicit
       * path: LinkedIn is deliberately trusted (so linking doesn't also
       * require an already-verified LinkedIn email) and allowed to have a
       * different email than the admin's Google sign-in — the admin already
       * proved who they are by reaching this button from an authenticated
       * session; requiring the two providers to share an email besides is
       * friction with no security benefit here.
       */
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: ["google", "linkedin"],
        allowDifferentEmails: true,
      },
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

      /**
       * LinkedIn, registered as a generic OAuth2/OIDC provider rather than a
       * built-in `socialProviders` entry — this version of Better Auth ships
       * no first-class LinkedIn integration. Nobody signs *in* with it; the
       * admin links it from an existing session (`linkLinkedIn`) purely so
       * the publish flow has a token to post through (`src/lib/linkedin/`).
       *
       * `pkce: false`: LinkedIn's authorization endpoint doesn't support PKCE,
       * and sending an unrecognized `code_challenge` risks a stricter
       * implementation rejecting the request outright.
       *
       * `accountSubject` reads the OIDC `sub` claim explicitly. Without a
       * `discoveryUrl` this plugin defaults to a plain-OAuth `id` field, which
       * LinkedIn's userinfo response doesn't have — only `sub` — so the
       * account would fail to key correctly without this override.
       */
      ...(linkedin
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "linkedin",
                  clientId: linkedin.clientId,
                  clientSecret: linkedin.clientSecret,
                  authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
                  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
                  userInfoUrl: "https://api.linkedin.com/v2/userinfo",
                  scopes: ["openid", "profile", "email", "w_member_social"],
                  pkce: false,
                  accountSubject: ({ profile }) =>
                    String((profile as { sub: string }).sub),
                  mapProfileToUser: (profile) => ({
                    name: profile.name as string | undefined,
                    email: profile.email as string | undefined,
                    image: profile.picture as string | undefined,
                    emailVerified: Boolean(profile.email_verified),
                  }),
                },
              ],
            }),
          ]
        : []),
    ],
  });
}

export function getAuth() {
  instance ??= create();
  return instance;
}
