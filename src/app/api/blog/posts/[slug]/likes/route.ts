import { getSessionFromRequest, requireUser } from "@/lib/auth/session";
import { hasBlog } from "@/lib/blog/config";
import { getReactionState, toggleReaction } from "@/lib/db/reactions";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  sameOrigin,
  unauthorized,
} from "@/lib/http/guards";

/**
 * Liking a post, and reading the viewer's own like state.
 *
 * The GET exists because the *count* can be server-rendered into a cached page
 * but **whether this particular reader liked it cannot** — a per-visitor value in
 * shared HTML is the quietest way to leak one reader's state to another. So the
 * button fetches its own state on mount and reconciles from there.
 *
 * The POST is a toggle rather than separate like and unlike endpoints, because
 * the underlying statement is one `ON CONFLICT DO UPDATE` that serves both. It
 * returns the authoritative new state so an optimistic button can correct itself
 * rather than drift.
 *
 * Liking a draft is impossible without a separate check: the statement resolves
 * the post through the same published filter every public read uses, so an
 * unpublished slug matches no rows and this returns 404.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

/** Generous: this is a read, and the button issues one per page view. */
const READ_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Tight, and keyed by *user* rather than by IP.
 *
 * `clientKey`'s IP basis is weak behind carrier-grade NAT, where a whole city can
 * share an address — a per-IP limit would either be useless or would punish
 * everyone for one abuser. An authenticated identity is the stronger signal, and
 * liking requires one.
 */
const WRITE_LIMIT = { limit: 30, windowMs: 60_000 };

export async function GET(request: Request, { params }: Params) {
  if (!hasBlog()) return notFound();

  const limit = rateLimit(clientKey(request, "blog-like-read"), READ_LIMIT);
  if (!limit.allowed) {
    return errorResponse(429, "Too many requests.", {}, limit.retryAfterSeconds);
  }

  // Anonymous is fine here: `liked` is simply false for a signed-out reader.
  const user = await getSessionFromRequest(request);

  try {
    const state = await getReactionState({
      slug: params.slug,
      viewerId: user?.id ?? null,
    });
    if (!state) return notFound();

    return okResponse({ count: state.count, liked: state.liked });
  } catch (error) {
    return databaseError(error, "blog/likes");
  }
}

export async function POST(request: Request, { params }: Params) {
  if (!hasBlog()) return notFound();

  // A body-less toggle, so there is nothing to parse or size-check — but it is
  // still a state change, so the cross-origin rule applies.
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  const auth = await requireUser(request);
  if (!auth.ok) return unauthorized();

  const limit = rateLimit(`blog-like:${auth.user.id}`, WRITE_LIMIT);
  if (!limit.allowed) {
    return errorResponse(
      429,
      "That's a lot of liking. Give it a moment.",
      {},
      limit.retryAfterSeconds,
    );
  }

  try {
    const result = await toggleReaction({
      slug: params.slug,
      userId: auth.user.id,
    });
    if (!result) return notFound();

    // The count is read back rather than incremented locally, so the number the
    // client settles on is the database's, not an estimate.
    const state = await getReactionState({
      slug: params.slug,
      viewerId: auth.user.id,
    });

    return okResponse({
      liked: result.active,
      count: state?.count ?? 0,
    });
  } catch (error) {
    return databaseError(error, "blog/likes");
  }
}
