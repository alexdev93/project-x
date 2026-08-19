/**
 * Who is an administrator.
 *
 * The answer lives in an environment variable, not in the database, and that is
 * the single most important security decision in the blog feature. Consequences,
 * spelled out because they are the reason:
 *
 * - No SQL write path can grant administrator rights. A stolen database
 *   credential or an injection bug gets an attacker data, not the admin panel.
 * - There is no bootstrap problem. A "first user to sign in becomes admin" rule
 *   is a race against every crawler that finds the OAuth callback, and seeding a
 *   role row by hand is the sort of undocumented step that breaks a rebuild two
 *   years later.
 * - Revoking access is a redeploy rather than an UPDATE. That is the one axis
 *   where this loses, and for a single-owner portfolio it never comes up.
 *
 * The database holds the *opposite* capability — `blocked_users` — so removal is
 * data and elevation is configuration.
 *
 * No I/O, no imports: this module is pure so it can be unit-tested exhaustively,
 * which is what a privilege boundary deserves.
 */

/**
 * Parse the allowlist into a Set.
 *
 * A Set and exact equality, never `ADMIN_EMAILS.includes(email)`: substring
 * matching against the raw string would let `alex@example.com.attacker.test`
 * satisfy an allowlist containing `alex@example.com`.
 */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}

/**
 * `emailVerified` is required as well as the allowlist.
 *
 * Google always verifies the addresses it returns, so this is belt-and-braces
 * today. It is here for the day a second provider is added: an unverified
 * address from a provider that does not check them would otherwise be enough to
 * impersonate the owner's address and inherit the allowlist entry.
 */
export function isAdmin(
  user: { email?: string | null; emailVerified?: boolean | null } | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!user?.emailVerified) return false;
  return isAdminEmail(user.email, raw);
}

/** True when at least one administrator is configured. Unset env means nobody. */
export function hasAdmins(
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  return parseAdminEmails(raw).size > 0;
}
