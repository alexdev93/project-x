import "server-only";

import { getLinkedInAccessToken } from "./account";

/**
 * LinkedIn's versioned REST API — every request must carry a `YYYYMM` version
 * header naming a release the caller was built against. Bump this
 * occasionally; LinkedIn keeps old versions working for a while, it does not
 * keep them working forever.
 */
const API_VERSION = "202509";

/**
 * Posts a link share to the given member's LinkedIn feed.
 *
 * `content.article` is what turns a plain text post into a rich link card —
 * without it this would just be a wall of text with a URL in the middle,
 * which is not how a "share on LinkedIn" button reads on any other site.
 *
 * Throws on failure rather than swallowing it. The caller (the publish route)
 * decides what "best effort" means here — this function's job is only to
 * report accurately whether the share actually happened.
 */
export async function shareLinkOnLinkedIn({
  headers,
  accountId,
  memberId,
  commentary,
  url,
  title,
  description,
}: {
  headers: Headers;
  accountId: string;
  memberId: string;
  /** The post's own text, shown above the link card. */
  commentary: string;
  url: string;
  title: string;
  description?: string;
}): Promise<void> {
  const accessToken = await getLinkedInAccessToken(headers, accountId);

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: url,
          title,
          ...(description ? { description } : {}),
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn share failed (${response.status}): ${body.slice(0, 300)}`);
  }
}
