import { NextResponse, type NextRequest } from "next/server";

/**
 * An optimistic bounce off /admin for visitors with no session cookie.
 *
 * **This is not a security boundary, and must never become one.** It checks for
 * the *presence* of a cookie, not its validity, and it cannot know whether the
 * account behind that cookie is an administrator — the allowlist is a server-side
 * environment variable, and middleware runs on the edge where reaching it to
 * verify a signature would mean a database round trip on every request.
 *
 * What it buys is the common case: an anonymous visitor who follows a stale link
 * to /admin is sent to sign in immediately instead of loading a shell that then
 * 404s. Anyone who forges the cookie gets exactly as far as the next check.
 *
 * **Sends to `/sign-in`, not `/`.** It used to redirect home, on the theory that
 * an anonymous visitor here is almost always a stale link or a crawler. It
 * missed the one visitor who is neither: the owner, signed out, with nowhere on
 * the site to sign back in from — sign-in only otherwise lives next to the
 * actions that need it (a comment box), so an owner who lands on /admin signed
 * out with no blog post open had no way to ever get back in. `/sign-in` returns
 * here (`callbackURL`) once they do.
 *
 * The two real boundaries are elsewhere and both re-derive authorization from
 * scratch: `requireAdmin()` at the top of every /api/admin/* handler, and the
 * `notFound()` in the admin layout. Neither trusts this file, and no handler may
 * rely on an ancestor having run.
 */

/** Better Auth's cookie, and the `__Secure-` prefix it uses over HTTPS. */
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function proxy(request: NextRequest) {
  const signedIn = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );

  if (signedIn) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("callbackURL", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  /**
   * `/admin` and everything under it. Nothing else — a matcher wider than it
   * needs to be would put an edge function in front of statically served pages
   * for no benefit.
   */
  matcher: ["/admin", "/admin/:path*"],
};
