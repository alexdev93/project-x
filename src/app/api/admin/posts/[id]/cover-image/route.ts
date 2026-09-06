import { requireAdmin } from "@/lib/auth/session";
import { getLinkedInPostState, setCoverImage } from "@/lib/db/posts";
import { revalidatePost } from "@/lib/blog/invalidate";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { uploadLinkedInAsset } from "@/lib/linkedin/assets";
import { relinkLinkedInPost } from "@/lib/linkedin/relink";
import { deleteCoverImage, uploadCoverImage } from "@/lib/media/blob";
import { errorResponse, notFound, okResponse, sameOrigin } from "@/lib/http/guards";

/**
 * A post's cover image: stored in Vercel Blob so it can be shown on the post
 * itself, plus the same file uploaded to LinkedIn's own asset storage for use
 * as the first photo of a real LinkedIn image/gallery post (see
 * lib/linkedin/content.ts — not a link-preview thumbnail). The two uploads
 * are independent — a post can have a cover image before LinkedIn is even
 * connected, it just shares without one until it's connected.
 *
 * Removing the cover image also clears every extra gallery photo (see
 * setCoverImage) — the gallery is always this image followed by the extras,
 * so there is nothing for the extras to follow without it.
 *
 * If the post is already published and already shared, saving or removing
 * the image also replaces the live LinkedIn post — see relinkLinkedInPost for
 * why an in-place update isn't possible.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Comfortably under Vercel's default serverless request body limit (4.5 MB).
const MAX_BYTES = 4 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, props: Params) {
  const params = await props.params;
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
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return errorResponse(400, "Choose an image file.");
  }
  if (file.size > MAX_BYTES) {
    return errorResponse(413, "That image is too large - 4 MB max.");
  }

  try {
    const state = await getLinkedInPostState(params.id);
    if (!state) return notFound();

    const url = await uploadCoverImage(params.id, file);

    // Best effort: a missing LinkedIn connection still leaves the post with a
    // real cover image, just without a thumbnail on its next share.
    let linkedInUrn: string | null = null;
    const account = await getLinkedInAccount(request.headers);
    if (account) {
      try {
        linkedInUrn = await uploadLinkedInAsset({
          headers: request.headers,
          accountId: account.accountId,
          memberId: account.memberId,
          kind: "image",
          data: Buffer.from(await file.arrayBuffer()),
        });
      } catch (error) {
        console.error(
          `[posts/cover-image] LinkedIn thumbnail upload failed for ${params.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (state.coverImageUrl) await deleteCoverImage(state.coverImageUrl);
    await setCoverImage(params.id, { url, linkedInUrn });
    revalidatePost(state.slug);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ url, relinked });
  } catch (error) {
    console.error(
      `[posts/cover-image] upload failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't save that image.");
  }
}

export async function DELETE(request: Request, props: Params) {
  const params = await props.params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    const state = await getLinkedInPostState(params.id);
    if (!state) return notFound();

    if (state.coverImageUrl) await deleteCoverImage(state.coverImageUrl);
    await setCoverImage(params.id, null);
    revalidatePost(state.slug);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ relinked });
  } catch (error) {
    console.error(
      `[posts/cover-image] remove failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't remove that.");
  }
}
