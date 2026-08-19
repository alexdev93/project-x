import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { blockUser, unblockUser } from "@/lib/db/users";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  sameOrigin,
} from "@/lib/http/guards";

/**
 * Blocking and unblocking a reader.
 *
 * The only capability the database is allowed to *remove* — administrator rights
 * are granted by environment variable and deliberately never stored here, so a
 * compromised database can silence someone but cannot promote anyone. See
 * src/lib/auth/admin.ts.
 *
 * Blocking stops new comments; it does not retract old ones. Hiding what someone
 * already said is a separate, deliberate act through the moderation queue, which
 * keeps "stop this person posting" and "remove this thing they said" as two
 * decisions rather than one blunt instrument.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockSchema = z.object({
  /** For the owner's own records. Never shown to the person blocked. */
  reason: z.string().trim().max(200).default(""),
});

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const checked = await checkRequest(request);
  if (checked.response) return checked.response;

  const parsed = blockSchema.safeParse(checked.body ?? {});
  if (!parsed.success) return errorResponse(400, "Invalid request.");

  // Blocking yourself would lock the owner out of their own comment threads
  // while leaving the admin panel open — confusing rather than dangerous, and
  // trivially avoidable.
  if (params.id === auth.user.id) {
    return errorResponse(400, "You can't block yourself.");
  }

  try {
    const blocked = await blockUser(params.id, parsed.data.reason);
    if (!blocked) return notFound();

    return okResponse({ userId: blocked.userId, blocked: true });
  } catch (error) {
    return databaseError(error, "admin/users/block");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    const unblocked = await unblockUser(params.id);
    if (!unblocked) return notFound();

    return okResponse({ userId: unblocked.userId, blocked: false });
  } catch (error) {
    return databaseError(error, "admin/users/block");
  }
}
