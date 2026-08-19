import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { revalidateThread } from "@/lib/blog/invalidate";
import { deleteCommentAsAdmin, setCommentStatus } from "@/lib/db/comments";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  sameOrigin,
} from "@/lib/http/guards";

/**
 * Moderation: approving, hiding, and removing a comment outright.
 *
 * The delete here is a *hard* one, and it is a different data-layer function
 * from the visitor's withdraw for exactly that reason — it takes no user id, so
 * it can only be reached from behind `requireAdmin()`, and the compiler will not
 * let a visitor-facing route call it by mistake. Its cascade removes the replies
 * beneath, which is the one case where that is the intent rather than collateral
 * damage.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({ action: z.enum(["approve", "hide"]) });

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const checked = await checkRequest(request);
  if (checked.response) return checked.response;

  const parsed = patchSchema.safeParse(checked.body);
  if (!parsed.success) return errorResponse(400, "Unknown action.");

  const status = parsed.data.action === "approve" ? "visible" : "hidden";

  try {
    const changed = await setCommentStatus(params.id, status);
    if (!changed) return notFound();

    revalidateThread(changed.postSlug);
    return okResponse({ id: changed.id, status });
  } catch (error) {
    return databaseError(error, "admin/comments/[id]");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    const removed = await deleteCommentAsAdmin(params.id);
    if (!removed) return notFound();

    revalidateThread(removed.postSlug);
    return okResponse({ id: removed.id });
  } catch (error) {
    return databaseError(error, "admin/comments/[id]");
  }
}
