import { requireUser } from "@/lib/auth/session";
import { getBlogConfig, hasBlog } from "@/lib/blog/config";
import { initialCommentStatus } from "@/lib/blog/policy";
import { commentInputSchema } from "@/lib/blog/schema";
import { revalidateThread } from "@/lib/blog/invalidate";
import { createComment, createReply, isBlocked } from "@/lib/db/comments";
import { rateLimit } from "@/lib/rate-limit";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  unauthorized,
} from "@/lib/http/guards";

/**
 * Posting a comment or a reply.
 *
 * There is no GET here: the thread is server-rendered into the post's page, so
 * there is nothing for a client to fetch. That keeps comments indexable and the
 * list free of JavaScript.
 *
 * The check order is the house sequence — rate limit, origin, size, parse,
 * validate, authenticate, authorize, work — with one addition: the block list is
 * consulted after authentication, since it is keyed by user.
 *
 * Which post a comment lands on is decided by the *statement*, not by this
 * handler: the insert resolves the slug against the published filter, and a reply
 * inherits its post from its parent row. So commenting on a draft, or grafting a
 * reply onto another post, are not conditions this code has to remember to
 * check — they are shapes the SQL cannot express.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function POST(request: Request, { params }: Params) {
  if (!hasBlog()) return notFound();

  const checked = await checkRequest(request, { maxBytes: 32 * 1024 });
  if (checked.response) return checked.response;

  const config = getBlogConfig();
  const parsed = commentInputSchema().safeParse(checked.body);
  if (!parsed.success) {
    return errorResponse(400, "Please check your comment and try again.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const auth = await requireUser(request);
  if (!auth.ok) return unauthorized();

  // Keyed by user rather than IP: commenting requires a session, so the stronger
  // identity is available, and an IP bucket would punish everyone behind a
  // shared address for one abuser.
  const limit = rateLimit(`blog-comment:${auth.user.id}`, {
    limit: config.commentRateLimit,
    windowMs: config.commentRateWindowSeconds * 1000,
  });
  if (!limit.allowed) {
    return errorResponse(
      429,
      "You're commenting quickly. Give it a moment.",
      {},
      limit.retryAfterSeconds,
    );
  }

  const { body, parentId } = parsed.data;

  try {
    if (await isBlocked(auth.user.id)) {
      // Deliberately the same wording a rate limit gets, and no explanation.
      // Telling someone they are blocked invites a second account; telling them
      // nothing means the comment simply does not appear.
      return errorResponse(403, "That comment couldn't be posted.");
    }

    const status = initialCommentStatus(body);

    const created = parentId
      ? await createReply({ parentId, userId: auth.user.id, body, status })
      : await createComment({ slug: params.slug, userId: auth.user.id, body, status });

    // No row means: no such published post, no such parent, the parent is
    // itself a reply, or the parent is hidden. All four are a 404 here.
    if (!created) return notFound();

    // Only when it is actually visible — a pending comment changes nothing a
    // reader would see, so there is no cached page to rebuild.
    if (created.status === "visible") revalidateThread(params.slug);

    return okResponse(
      {
        id: created.id,
        status: created.status,
        /** The form shows a waiting note when this is true. */
        pending: created.status === "pending",
      },
      201,
    );
  } catch (error) {
    return databaseError(error, "blog/comments");
  }
}
