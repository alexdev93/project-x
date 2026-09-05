import "server-only";

import { getAuth } from "@/lib/auth/server";

/**
 * Reading the admin's linked LinkedIn account.
 *
 * Never touches `auth_account` directly, even though the columns are
 * documented in schema.sql — Better Auth encrypts `accessToken` at rest, so a
 * raw `SELECT` would hand back ciphertext. `getAccessToken` decrypts (and
 * refreshes, if the stored token has expired) through the same code path a
 * normal request would use.
 */

export type LinkedInAccount = {
  /** Better Auth's own row id — what `getAccessToken`/`unlinkAccount` select by. */
  accountId: string;
  /** LinkedIn's own subject (the OIDC `sub` claim) — what the author URN needs. */
  memberId: string;
};

/** The signed-in admin's linked LinkedIn account, if any. */
export async function getLinkedInAccount(
  headers: Headers,
): Promise<LinkedInAccount | null> {
  const accounts = await getAuth().api.listUserAccounts({ headers });
  const account = accounts.find((entry) => entry.providerId === "linkedin");
  return account ? { accountId: account.id, memberId: account.accountId } : null;
}

/** A valid access token for that account — refreshed first if it had expired. */
export async function getLinkedInAccessToken(
  headers: Headers,
  accountId: string,
): Promise<string> {
  const result = await getAuth().api.getAccessToken({
    headers,
    body: { accountId },
  });

  if (!result?.accessToken) {
    throw new Error("LinkedIn did not return an access token");
  }

  return result.accessToken;
}
