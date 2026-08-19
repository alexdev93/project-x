import { requireUser } from "@/lib/auth/session";
import { getBlogConfig, hasBlog } from "@/lib/blog/config";
import { commentEditSchema } from "@/lib/blog/schema";
import { revalidateThread } from "@/lib/blog/invalidate";
import { softDeleteOwnComment, updateOwnComment } from "@/lib/db/comments";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  sameOrigin,
  unauthorized,
} from "@/lib/http/guards";

/**
 * Editing and withdrawing one's own comment.
 *
 * Neither handler checks ownership, and that is the design rather than an
 * oversight: the data-layer functions take a `userId` in their signature and
 * carry it into the statement's `WHERE`, so a comment belonging to someone else
 * matches zero rows. The same is true of the edit window. Both come back here as
 * `null`, and both become the same 404 — which is also what a genuinely missing
 * comment returns, so nothing here can be used to discover whether a given
 * comment exists.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  if (!hasBlog()) return notFound();

  const checked = await checkRequest(request, { maxBytes: 32 * 1024 });
  if (checked.response) return checked.response;

  const parsed = commentEditSchema().safeParse(checked.body);
  if (!parsed.success) {
    return errorResponse(400, "Please check your comment and try again.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const auth = await requireUser(request);
  if (!auth.ok) return unauthorized();

  try {
    const updated = await updateOwnComment({
      id: params.id,
      userId: auth.user.id,
      body: parsed.data.body,
      windowMinutes: getBlogConfig().commentEditWindowMinutes,
    });

    // Not yours, too late, already withdrawn, or never existed.
    if (!updated) return notFound();

    revalidateThread(updated.postSlug);
    return okResponse({ id: updated.id, body: parsed.data.body });
  } catch (error) {
    return databaseError(error, "blog/comments/[id]");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!hasBlog()) return notFound();

  // Bodyless, so only the cross-origin rule applies.
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  const auth = await requireUser(request);
  if (!auth.ok) return unauthorized();

  try {
    const removed = await softDeleteOwnComment({
      id: params.id,
      userId: auth.user.id,
    });
    if (!removed) return notFound();

    revalidateThread(removed.postSlug);
    return okResponse({ id: removed.id });
  } catch (error) {
    return databaseError(error, "blog/comments/[id]");
  }
}
