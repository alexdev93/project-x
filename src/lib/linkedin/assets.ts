import "server-only";

import { getLinkedInAccessToken } from "./account";

/**
 * Uploading an image or document to LinkedIn's own asset storage, for a post
 * to reference. Nothing is kept on this site's side — the file goes straight
 * from the admin's upload to LinkedIn's `initializeUpload` + `PUT` flow, which
 * is why this needs no storage of its own (no Blob, no bucket, no cost beyond
 * LinkedIn's own free API).
 *
 * Same two-step shape for both asset kinds:
 *   1. POST /rest/{images,documents}?action=initializeUpload — registers the
 *      upload and returns a one-time `uploadUrl` plus the asset's own URN.
 *   2. PUT the raw bytes to that `uploadUrl`, authenticated the same way.
 */

export type LinkedInAssetKind = "image" | "document";

type InitializeUploadResponse = {
  value: { uploadUrl: string; image?: string; document?: string };
};

export async function uploadLinkedInAsset({
  headers,
  accountId,
  memberId,
  kind,
  data,
}: {
  headers: Headers;
  accountId: string;
  memberId: string;
  kind: LinkedInAssetKind;
  data: Buffer;
}): Promise<string> {
  const accessToken = await getLinkedInAccessToken(headers, accountId);
  const resource = kind === "image" ? "images" : "documents";

  const initResponse = await fetch(
    `https://api.linkedin.com/rest/${resource}?action=initializeUpload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202509",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner: `urn:li:person:${memberId}` },
      }),
    },
  );

  if (!initResponse.ok) {
    const body = await initResponse.text().catch(() => "");
    throw new Error(
      `LinkedIn ${kind} upload init failed (${initResponse.status}): ${body.slice(0, 300)}`,
    );
  }

  const { value } = (await initResponse.json()) as InitializeUploadResponse;
  const urn = kind === "image" ? value.image : value.document;
  if (!urn) throw new Error(`LinkedIn ${kind} upload init returned no asset URN`);

  // The upload call takes only the bearer token, no LinkedIn-Version or
  // Restli headers — this is a plain DMS upload, not a versioned REST call.
  const uploadResponse = await fetch(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    // Node's fetch accepts a Buffer body at runtime; the DOM BodyInit type
    // this codebase's lib target pulls in doesn't know that.
    body: new Uint8Array(data),
  });

  if (!uploadResponse.ok) {
    const body = await uploadResponse.text().catch(() => "");
    throw new Error(
      `LinkedIn ${kind} upload failed (${uploadResponse.status}): ${body.slice(0, 300)}`,
    );
  }

  return urn;
}
