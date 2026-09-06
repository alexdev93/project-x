import { requireAdmin } from "@/lib/auth/session";
import { setLinkedInDocument } from "@/lib/db/posts";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { uploadLinkedInAsset } from "@/lib/linkedin/assets";
import { relinkLinkedInPost } from "@/lib/linkedin/relink";
import { errorResponse, notFound, okResponse, sameOrigin } from "@/lib/http/guards";

/**
 * A document (PDF, DOC, PPT) shared instead of the default article link
 * preview. LinkedIn-only, unlike the cover image — there's no portfolio-side
 * equivalent of a "document post" to keep this in sync with, so nothing is
 * stored anywhere but LinkedIn's own asset storage (see assets.ts).
 *
 * If the post is already published and already shared, changing the document
 * also replaces the live LinkedIn post — see relinkLinkedInPost.
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
  if (!(file instanceof File)) {
    return errorResponse(400, "Missing file.");
  }
  if (file.size > MAX_BYTES) {
    return errorResponse(413, "That file is too large - 4 MB max.");
  }

  const account = await getLinkedInAccount(request.headers);
  if (!account) {
    return errorResponse(503, "Connect LinkedIn first (see the Overview page).");
  }

  try {
    const urn = await uploadLinkedInAsset({
      headers: request.headers,
      accountId: account.accountId,
      memberId: account.memberId,
      kind: "document",
      data: Buffer.from(await file.arrayBuffer()),
    });

    await setLinkedInDocument(params.id, urn);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-document] upload failed for ${params.id}:`,
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

  try {
    await setLinkedInDocument(params.id, null);

    const relinked = await relinkLinkedInPost(request.headers, params.id);

    return okResponse({ relinked });
  } catch (error) {
    console.error(
      `[posts/linkedin-document] remove failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't update LinkedIn.");
  }
}
