import "server-only";

import { getLinkedInPostState, setLinkedInPostUrn } from "@/lib/db/posts";
import { getLinkedInAccount } from "./account";
import { buildLinkedInContent } from "./content";
import { createLinkedInPost, deleteLinkedInPost } from "./share";

/**
 * Replaces the live LinkedIn post for `id` with one built from its current
 * state — the only way to change what a published post is attached to, since
 * LinkedIn's partial-update API can edit a post's text but not its content
 * (see share.ts). A no-op when the post isn't published or was never shared;
 * the new state still applies the next time it is.
 */
export async function relinkLinkedInPost(
  headers: Headers,
  id: string,
): Promise<boolean> {
  const state = await getLinkedInPostState(id);
  if (!state?.postUrn || state.status !== "published") return false;

  const account = await getLinkedInAccount(headers);
  if (!account) return false;

  const { content, commentary } = buildLinkedInContent(state);

  await deleteLinkedInPost({ headers, accountId: account.accountId, urn: state.postUrn });

  const urn = await createLinkedInPost({
    headers,
    accountId: account.accountId,
    memberId: account.memberId,
    commentary,
    content,
  });

  await setLinkedInPostUrn(id, urn);
  return true;
}
