import "server-only";

import { getLinkedInAccessToken } from "./account";

/**
 * Creating, updating and deleting a LinkedIn post.
 *
 * `LinkedIn-Version` names a release the caller was built against (LinkedIn
 * keeps old versions working for a while, not forever — bump this
 * occasionally). `X-Restli-Protocol-Version` is fixed at "2.0.0" across every
 * call; it names the wire protocol, not a release, and has nothing to bump.
 */
const API_VERSION = "202509";

const REST_HEADERS = {
  "Content-Type": "application/json",
  "LinkedIn-Version": API_VERSION,
  "X-Restli-Protocol-Version": "2.0.0",
};

export type LinkedInPostContent =
  | {
      /** A link preview card — LinkedIn fetches nothing itself; title and
       * description come from this site's own content. */
      type: "article";
      url: string;
      title: string;
      description?: string;
    }
  | {
      /** A single previously-uploaded image or document (see assets.ts). */
      type: "media";
      urn: string;
      /** Required by LinkedIn for a document; optional for an image. */
      title?: string;
      altText?: string;
    };

function buildContent(content: LinkedInPostContent): Record<string, unknown> {
  if (content.type === "article") {
    return {
      article: {
        source: content.url,
        title: content.title,
        ...(content.description ? { description: content.description } : {}),
      },
    };
  }

  return {
    media: {
      id: content.urn,
      ...(content.title ? { title: content.title } : {}),
      ...(content.altText ? { altText: content.altText } : {}),
    },
  };
}

/**
 * Posts to the given member's LinkedIn feed. Returns the new post's URN
 * (e.g. "urn:li:share:...") — LinkedIn hands this back in the `x-restli-id`
 * response header on a 201, not in the response body.
 */
export async function createLinkedInPost({
  headers,
  accountId,
  memberId,
  commentary,
  content,
}: {
  headers: Headers;
  accountId: string;
  memberId: string;
  commentary: string;
  content: LinkedInPostContent;
}): Promise<string> {
  const accessToken = await getLinkedInAccessToken(headers, accountId);

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, ...REST_HEADERS },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: buildContent(content),
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn share failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const urn = response.headers.get("x-restli-id");
  if (!urn) throw new Error("LinkedIn created the post but returned no post URN");

  return urn;
}

/**
 * Edits the text of an already-published post in place. Only a handful of
 * fields are editable this way — `commentary` is one of them, but the
 * attached article/media is not, so a changed attachment has to go through
 * `deleteLinkedInPost` + `createLinkedInPost` instead (see the publish route).
 */
export async function updateLinkedInPostCommentary({
  headers,
  accountId,
  urn,
  commentary,
}: {
  headers: Headers;
  accountId: string;
  urn: string;
  commentary: string;
}): Promise<void> {
  const accessToken = await getLinkedInAccessToken(headers, accountId);

  const response = await fetch(
    `https://api.linkedin.com/rest/posts/${encodeURIComponent(urn)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-RestLi-Method": "PARTIAL_UPDATE",
        ...REST_HEADERS,
      },
      body: JSON.stringify({ patch: { $set: { commentary } } }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn post update failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

/** Idempotent — deleting an already-deleted post also returns success. */
export async function deleteLinkedInPost({
  headers,
  accountId,
  urn,
}: {
  headers: Headers;
  accountId: string;
  urn: string;
}): Promise<void> {
  const accessToken = await getLinkedInAccessToken(headers, accountId);

  const response = await fetch(
    `https://api.linkedin.com/rest/posts/${encodeURIComponent(urn)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}`, ...REST_HEADERS },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn post delete failed (${response.status}): ${body.slice(0, 300)}`);
  }
}
