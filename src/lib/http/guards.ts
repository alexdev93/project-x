import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site";

/**
 * The checks every mutating route runs, and the response shapes they produce.
 *
 * Order matters, and it is the same everywhere — an extension of the sequence
 * the chat and contact routes already follow:
 *
 *   rate limit → same-origin → size cap → JSON parse → zod → authenticate →
 *   authorize → work
 *
 * The cheap rejections come first so an abusive client is turned away before
 * anything expensive happens, and authorization comes last among the checks but
 * still strictly before any data-layer call.
 *
 * Every error body keeps the shape the contact route established —
 * `{ success: false, error }`, plus `fieldErrors` where a form needs them — so
 * the client-side handling written for one form works for all of them.
 */

/** Vague on purpose. Details go to the server log, never to the response. */
export function errorResponse(
  status: number,
  error: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { success: false, error, ...extra },
    // Authenticated responses must never sit in a shared cache. Applied to
    // every error too, since a 429 or a 401 cached against a URL would be
    // served to the next visitor.
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function okResponse(
  data: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    { success: true, ...data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** 401: signing in would fix this. */
export const unauthorized = () =>
  errorResponse(401, "Sign in to do that.");

/**
 * 404: either it does not exist, it is not yours, or you are not permitted.
 *
 * Deliberately one response for all three. A 403 would confirm that the thing
 * exists, which turns any list endpoint into an oracle for enumerating other
 * people's content and turns /admin into something discoverable by probing.
 */
export const notFound = () => errorResponse(404, "Not found.");

/**
 * Reject cross-origin state changes.
 *
 * Two independent checks, and the second does more work than it appears to:
 *
 *  * `Origin` must match the host this request was actually sent to. Browsers
 *    set Origin on every non-GET request and page script cannot forge it.
 *  * `Content-Type` must be JSON. An HTML form can only send
 *    `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`,
 *    so requiring JSON blocks the classic cross-site form post outright — no
 *    token, no session state, no per-form bookkeeping.
 *
 * **Compared against the request's own host, not against `siteUrl`.** That was
 * the first implementation and it was wrong twice over: Next inlines
 * `NEXT_PUBLIC_` variables at *build* time, so `siteUrl` is frozen to whatever
 * the build saw — which rejected every request to a Vercel preview deployment,
 * whose host differs from production, and rejected local testing outright. The
 * property CSRF protection actually needs is "the page that made this request
 * was served by the same host that received it", and that is exactly what
 * comparing Origin to Host expresses. `siteUrl` is still accepted as an
 * alternative, so a request through a proxy that rewrites Host is not refused.
 *
 * Sending both headers by hand from a script defeats nothing: a cross-site
 * request forgery needs a *victim's browser* to attach their cookie, and a
 * browser will not lie about Origin.
 *
 * A missing Origin is refused rather than waved through. Same-origin `fetch`
 * always sets it; the requests that do not are server-to-server, which is not
 * how this API is meant to be called.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // `x-forwarded-host` first: Vercel sets it to the host the visitor asked for.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && originHost === host) return true;

  try {
    return originHost === new URL(siteUrl).host;
  } catch {
    return false;
  }
}

/** Requires `Content-Type: application/json`, ignoring any charset suffix. */
export function isJsonRequest(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return type.split(";")[0].trim().toLowerCase() === "application/json";
}

/**
 * Refuse an oversized body before reading it.
 *
 * `content-length` is a hint a client controls, so this is a cheap early exit
 * rather than a guarantee — the real bound is the zod schema's `max()` on each
 * field, which runs on the parsed value. Both exist because rejecting a 10 MB
 * paste before buffering it is worth the header check.
 */
export function withinSizeLimit(request: Request, maxBytes: number): boolean {
  const length = Number(request.headers.get("content-length") ?? 0);
  return !Number.isFinite(length) || length <= maxBytes;
}

/** 64 kB. Comfortably above a long comment, far below anything abusive. */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Everything before authentication, in one call.
 *
 * Returns the parsed body or the response to send. Handlers stay linear:
 *
 *   const checked = await checkRequest(request);
 *   if (checked.response) return checked.response;
 *
 * Rate limiting stays at the call site rather than moving in here, because its
 * key and window differ per route and a single default would be wrong for all
 * of them.
 */
export async function checkRequest(
  request: Request,
  { maxBytes = DEFAULT_MAX_BODY_BYTES }: { maxBytes?: number } = {},
): Promise<{ body: unknown; response: null } | { body: null; response: NextResponse }> {
  if (!sameOrigin(request) || !isJsonRequest(request)) {
    return { body: null, response: errorResponse(400, "Invalid request.") };
  }

  if (!withinSizeLimit(request, maxBytes)) {
    return { body: null, response: errorResponse(413, "That is too long.") };
  }

  try {
    return { body: await request.json(), response: null };
  } catch {
    return { body: null, response: errorResponse(400, "Invalid request body.") };
  }
}

/**
 * Map a Postgres error to a response without leaking anything about it.
 *
 * Only one code is worth distinguishing for a user: 23505, a unique violation,
 * which for this application always means a slug is taken and is worth saying so
 * a form can highlight the field. Everything else is a 500 with a generic
 * message, and the detail goes to the log.
 */
export function databaseError(error: unknown, what: string): NextResponse {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "23505") {
    return errorResponse(409, "That slug is already taken.", {
      fieldErrors: { slug: ["That slug is already taken."] },
    });
  }

  console.error(
    `[${what}] database error:`,
    error instanceof Error ? error.message : error,
  );
  return errorResponse(500, "Something went wrong. Please try again.");
}
