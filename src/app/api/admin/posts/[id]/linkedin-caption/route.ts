import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getLinkedInPostState, setLinkedInCommentary } from "@/lib/db/posts";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { buildLinkedInContent } from "@/lib/linkedin/content";
import { updateLinkedInPostCommentary } from "@/lib/linkedin/share";
import { checkRequest, errorResponse, notFound, okResponse } from "@/lib/http/guards";

/**
 * The custom LinkedIn caption — independent of the post's title, because a
 * LinkedIn caption reads nothing like a blog headline (hashtags, mentions, a
 * call to action). Empty clears it, falling back to the title (see
 * lib/linkedin/content.ts).
 *
 * `commentary` is one of the handful of fields LinkedIn's partial-update API
 * can change in place, so unlike the image/gallery/document fields this
 * never needs a delete+recreate — a caption edit on an already-shared post
 * updates that same post directly.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LENGTH = 3000;

const captionSchema = z.object({ commentary: z.string().max(MAX_LENGTH) });

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const checked = await checkRequest(request);
  if (checked.response) return checked.response;

  const parsed = captionSchema.safeParse(checked.body);
  if (!parsed.success) {
    return errorResponse(400, `Keep it under ${MAX_LENGTH} characters.`);
  }
  const { commentary } = parsed.data;

  try {
    const state = await getLinkedInPostState(params.id);
    if (!state) return notFound();

    await setLinkedInCommentary(params.id, commentary);

    const synced = await syncIfLive(request, { ...state, commentary });

    return okResponse({ synced });
  } catch (error) {
    console.error(
      `[posts/linkedin-caption] save failed for ${params.id}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't save that.");
  }
}

/**
 * Updates the live LinkedIn post's text in place when this post is
 * published and already shared. A no-op otherwise — the caption still
 * applies the next time this post is actually shared.
 */
async function syncIfLive(
  request: Request,
  state: Awaited<ReturnType<typeof getLinkedInPostState>>,
): Promise<boolean> {
  if (!state?.postUrn || state.status !== "published") return false;

  const account = await getLinkedInAccount(request.headers);
  if (!account) return false;

  const { commentary } = buildLinkedInContent(state);

  await updateLinkedInPostCommentary({
    headers: request.headers,
    accountId: account.accountId,
    urn: state.postUrn,
    commentary,
  });

  return true;
}
