import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isAdmin } from "./admin";
import { hasAuth, missingAuthVars } from "./config";
import { getAuth } from "./server";

/**
 * Reading the current session on the server.
 *
 * ## The caching constraint, which shapes the whole feature
 *
 * `getSession()` calls `headers()`, and reading headers **opts a route out of
 * static rendering**. So these helpers may be called from `/admin/*` and from
 * route handlers — both of which are dynamic anyway — and **never** from a blog
 * or portfolio page. If a public page needs to know who is signed in, it renders
 * a client component that asks the auth endpoint itself; that keeps the page in
 * the static output and keeps per-visitor state out of a shared cache.
 *
 * Route handlers use `getSessionFromRequest()` instead, which takes the headers
 * it already has and therefore carries no such implication.
 *
 * ## Failure is a signed-out visitor, not an error
 *
 * An unconfigured deployment, a sleeping database, or a malformed cookie all
 * resolve to "nobody is signed in". Reading the blog never requires a session, so
 * degrading to anonymous is always the right answer — the alternative is a 500 on
 * a page that would otherwise render.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
};

/** Logged once per cold start, not per request, so logs stay readable. */
let warnedAboutConfig = false;

function warnMissingConfig(): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;

  // Names only, never values — the same treatment the Gemini key gets. This
  // exists because the likeliest production failure is a variable set in the
  // wrong Vercel scope, and the symptom without this line is a silent
  // "sign-in unavailable" with nothing to go on.
  console.error(
    `[auth] not configured; sign-in is disabled. Missing: ${missingAuthVars().join(", ")}`,
  );
}

function toUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    // Recomputed here rather than trusted from the session payload. The
    // customSession plugin puts the same flag in the cookie for the client's
    // benefit, but a server-side decision must never read a client-visible value.
    isAdmin: isAdmin(user),
  };
}

async function read(requestHeaders: Headers): Promise<SessionUser | null> {
  if (!hasAuth()) {
    warnMissingConfig();
    return null;
  }

  try {
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    return session?.user ? toUser(session.user) : null;
  } catch (error) {
    console.error(
      "[auth] session lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * The current user in a server component.
 *
 * Makes the calling route dynamic — see the note above. Only `/admin/*` should
 * reach for this.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return read(headers());
}

/** The current user in a route handler. No dynamic-rendering implication. */
export async function getSessionFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  return read(request.headers);
}

/**
 * Guard an admin *page*, not just its layout.
 *
 * This exists because of a measured failure, not a hunch. The layout's own
 * `notFound()` renders the not-found boundary — but Next renders a layout and
 * its page **concurrently**, so the page's body had already executed its data
 * reads and its markup reached the response. A visitor who was not an
 * administrator received the dashboard's counts. The layout guard governs
 * chrome; it does not gate anything the page itself does.
 *
 * So every admin page calls this first, before touching data. It throws Next's
 * not-found signal, so nothing after it runs, and the caller reads as a single
 * line at the top of the component.
 */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  return user;
}

/**
 * The outcome of an authorization check, as a value rather than an exception.
 *
 * Returning a discriminated union instead of throwing keeps the check and the
 * response next to each other in the handler, which is what makes it obvious at a
 * glance that no work happens before the check. A thrown error would put the
 * response in a catch block somewhere else, or worse, in a shared wrapper that a
 * future handler forgets to use.
 */
export type Authorized =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 404 };

/** Any signed-in visitor. 401 otherwise, because signing in would fix it. */
export async function requireUser(request: Request): Promise<Authorized> {
  const user = await getSessionFromRequest(request);
  return user ? { ok: true, user } : { ok: false, status: 401 };
}

/**
 * An administrator.
 *
 * **404, not 403.** A signed-in visitor who is not the owner gets exactly what a
 * crawler gets, so the admin surface is not discoverable by probing it. It also
 * means the response says nothing about whether ADMIN_EMAILS is configured.
 *
 * Every `/api/admin/*` handler calls this itself. The layout guard and the
 * middleware redirect are conveniences; this is the boundary.
 */
export async function requireAdmin(request: Request): Promise<Authorized> {
  const user = await getSessionFromRequest(request);
  if (!user) return { ok: false, status: 404 };
  return user.isAdmin ? { ok: true, user } : { ok: false, status: 404 };
}
