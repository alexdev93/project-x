import { requireAdmin } from "@/lib/auth/session";
import { getLinkedInPostState, setLinkedInExtraImages } from "@/lib/db/posts";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { uploadLinkedInAsset } from "@/lib/linkedin/assets";
import { relinkLinkedInPost } from "@/lib/linkedin/relink";
import { errorResponse, notFound, okResponse, sameOrigin } from "@/lib/http/guards";

/**
 * The LinkedIn photo gallery beyond the single cover image: LinkedIn-only,
 * same reasoning as the document field — there's no portfolio-side gallery
 * for these to also appear in. A gallery only exists on top of a cover
 * image (the cover is always the first photo; see lib/linkedin/content.ts),
 * so uploading here without one first is rejected rather than silently
 * creating a cover-less gallery LinkedIn has no way to render.
 *
 * Whole-list operations, not per-position ones: POST appends one photo to
 * the current list, DELETE removes one by its index in that list. The
 * server always reads the current list first, so the client never has to
 * track or resend positions.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Comfortably under Vercel's default serverless request body limit (4.5 MB).
const MAX_BYTES = 4 * 1024 * 1024;

// LinkedIn's multiImage cap is 20 total; this is the cover plus this many
// extras, kept well under that so the admin gallery stays a gallery, not an
// upload queue.
const MAX_EXTRA_IMAGES = 8;

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

  const altText = String(formData.get("altText") ?? "");

  try {
    const state = await getLinkedInPostState(params.id);
    if (!state) return notFound();

    if (!state.coverImageLinkedInUrn) {
      return errorResponse(400, "Add a cover image first - it's always the first photo.");
    }
    if (state.extraImages.length >= MAX_EXTRA_IMAGES) {
      return errorResponse(400, `That's the most photos this gallery supports (${MAX_EXTRA_IMAGES + 1}).`);
    }

    const account = await getLinkedInAccount(request.headers);
    if (!account) {
      return errorResponse(503, "Connect LinkedIn first (see the Overview page).");
    }

    const urn = await uploadLinkedInAsset({
      headers: request.headers,
      accountId: account.accountId,
      memberId: account.memberId,
      kind: "image",
      data: Buffer.from(await file.arrayBuffer()),
    });

    const images = [...state.extraImages, { urn, altText }];
    await setLinkedInExtraImages(params.id, images);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ images, relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-images] upload failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't upload that to LinkedIn.");
  }
}

export async function DELETE(request: Request, props: Params) {
  const params = await props.params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  let index: number;
  try {
    const body = (await request.json()) as { index?: unknown };
    if (typeof body.index !== "number" || !Number.isInteger(body.index) || body.index < 0) {
      return errorResponse(400, "Invalid request.");
    }
    index = body.index;
  } catch {
    return errorResponse(400, "Invalid request.");
  }

  try {
    const state = await getLinkedInPostState(params.id);
    if (!state) return notFound();

    const images = state.extraImages.filter((_, i) => i !== index);
    await setLinkedInExtraImages(params.id, images);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ images, relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-images] remove failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't remove that.");
  }
}
