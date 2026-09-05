import { requireAdmin } from "@/lib/auth/session";
import {
  getLinkedInPostState,
  setLinkedInAttachment,
  setLinkedInPostUrn,
} from "@/lib/db/posts";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { uploadLinkedInAsset, type LinkedInAssetKind } from "@/lib/linkedin/assets";
import {
  createLinkedInPost,
  deleteLinkedInPost,
  type LinkedInPostContent,
} from "@/lib/linkedin/share";
import { absoluteUrl } from "@/lib/site";
import { errorResponse, notFound, okResponse, sameOrigin } from "@/lib/http/guards";

/**
 * Choosing (or clearing) the image/document a post shares to LinkedIn
 * instead of a plain link preview.
 *
 * Uploads to LinkedIn immediately, on file select, rather than waiting for
 * publish — LinkedIn is the only place the file is ever stored (see
 * lib/linkedin/assets.ts), so there is nothing to hold onto locally in the
 * meantime; the URN it returns is the only thing worth keeping, and it's
 * durable on LinkedIn's side independent of when the post using it actually
 * exists.
 *
 * If the post is already published and already shared, changing the
 * attachment here also replaces the live LinkedIn post — delete the old one,
 * create a new one with the new attachment. LinkedIn's partial-update API
 * can change a post's text but not what it's attached to (see
 * lib/linkedin/share.ts), so an in-place swap isn't possible.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Comfortably under Vercel's default serverless request body limit (4.5 MB) —
// a PDF or image bigger than this needs a direct-upload path this route
// doesn't have.
const MAX_BYTES = 4 * 1024 * 1024;

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "Invalid upload.");
  }

  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || (kind !== "image" && kind !== "document")) {
    return errorResponse(400, "Missing file or attachment type.");
  }
  if (file.size > MAX_BYTES) {
    return errorResponse(413, "That file is too large — 4 MB max.");
  }

  const account = await getLinkedInAccount(request.headers);
  if (!account) {
    return errorResponse(503, "Connect LinkedIn first (see the Overview page).");
  }

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const urn = await uploadLinkedInAsset({
      headers: request.headers,
      accountId: account.accountId,
      memberId: account.memberId,
      kind: kind as LinkedInAssetKind,
      data,
    });

    await setLinkedInAttachment(params.id, { urn, kind: kind as LinkedInAssetKind });

    const relinked = await relinkIfLive(request, params.id, {
      type: "media",
      urn,
      title: undefined,
    });

    return okResponse({ kind, relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-attachment] upload failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't upload that to LinkedIn.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    await setLinkedInAttachment(params.id, null);

    const relinked = await relinkIfLive(request, params.id, null);

    return okResponse({ relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-attachment] remove failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't update LinkedIn.");
  }
}

/**
 * If this post is currently published and already has a live LinkedIn post,
 * replace it so the change is reflected there too. No-op otherwise — the
 * chosen attachment still gets used the next time this post is actually
 * published.
 */
async function relinkIfLive(
  request: Request,
  id: string,
  newAttachment: { type: "media"; urn: string; title?: string } | null,
): Promise<boolean> {
  const state = await getLinkedInPostState(id);
  if (!state?.postUrn || state.status !== "published") return false;

  const account = await getLinkedInAccount(request.headers);
  if (!account) return false;

  const title = state.title || id;

  const content: LinkedInPostContent = newAttachment
    ? { ...newAttachment, title, altText: state.excerpt || undefined }
    : {
        type: "article",
        url: absoluteUrl(`/blog/${state.slug}`),
        title,
        description: state.excerpt,
      };

  await deleteLinkedInPost({
    headers: request.headers,
    accountId: account.accountId,
    urn: state.postUrn,
  });

  const urn = await createLinkedInPost({
    headers: request.headers,
    accountId: account.accountId,
    memberId: account.memberId,
    commentary: title,
    content,
  });

  await setLinkedInPostUrn(id, urn);
  return true;
}
