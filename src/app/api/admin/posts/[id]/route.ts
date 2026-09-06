import { requireAdmin } from "@/lib/auth/session";
import { postInputSchema } from "@/lib/blog/schema";
import { excerpt, readingMinutes } from "@/lib/blog/text";
import {
  deletePost,
  getLinkedInPostState,
  updatePost,
  type LinkedInPostState,
} from "@/lib/db/posts";
import { revalidateFeed, revalidatePost } from "@/lib/blog/invalidate";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { buildLinkedInContent } from "@/lib/linkedin/content";
import { deleteLinkedInPost, updateLinkedInPostCommentary } from "@/lib/linkedin/share";
import { deleteCoverImage } from "@/lib/media/blob";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
  sameOrigin,
} from "@/lib/http/guards";

/** Editing and deleting one post. See the boundary note in ../route.ts. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, props: Params) {
  const params = await props.params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const checked = await checkRequest(request, { maxBytes: 256 * 1024 });
  if (checked.response) return checked.response;

  const parsed = postInputSchema().safeParse(checked.body);
  if (!parsed.success) {
    return errorResponse(400, "Please check the form and try again.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const { slug, title, body, tags } = parsed.data;

  try {
    // Read before writing: the only way to know whether the title actually
    // changed, which is what decides whether the live LinkedIn post (if any)
    // needs its text updated.
    const before = await getLinkedInPostState(params.id);

    const updated = await updatePost(params.id, {
      slug,
      title,
      body,
      excerpt: parsed.data.excerpt || excerpt(body),
      tags,
      readingMinutes: readingMinutes(body),
    });

    // No row means no such post. Nothing distinguishes that from "not allowed",
    // by design.
    if (!updated) return notFound();

    revalidatePost(updated.slug);
    // The slug may have changed, which orphans the old path — the feed
    // invalidation covers the index, and the old URL 404s on its next request.
    revalidateFeed();

    // A custom caption (see the LinkedIn tab) makes the title irrelevant to
    // what LinkedIn shows — only re-sync from a title change when no
    // caption has been written.
    if (
      before?.postUrn &&
      before.status === "published" &&
      !before.commentary?.trim() &&
      before.title !== title
    ) {
      await syncLinkedInCommentary(request, { ...before, title }, before.postUrn);
    }

    return okResponse({ post: updated });
  } catch (error) {
    return databaseError(error, "admin/posts/[id]");
  }
}

export async function DELETE(request: Request, props: Params) {
  const params = await props.params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  // A DELETE carries no body, so there is nothing to parse or size-check — but
  // it is still a state change, so the cross-origin rule applies. Checked
  // directly rather than through checkRequest, which would also demand a JSON
  // content type that a bodyless request has no reason to send.
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    const before = await getLinkedInPostState(params.id);

    const deleted = await deletePost(params.id);
    if (!deleted) return notFound();

    // Comments and reactions went with it, by ON DELETE CASCADE.
    revalidatePost(deleted.slug);
    revalidateFeed();

    if (before?.coverImageUrl) {
      await deleteCoverImage(before.coverImageUrl);
    }
    if (before?.postUrn) {
      await removeFromLinkedInBestEffort(request, params.id, before.postUrn);
    }

    return okResponse({ deleted: deleted.slug });
  } catch (error) {
    return databaseError(error, "admin/posts/[id]");
  }
}

/**
 * Best effort, same reasoning throughout this feature: the edit already
 * succeeded on this site by the time this runs, so a LinkedIn hiccup here
 * must never surface as the site-side save having failed. Only `commentary`
 * is updatable through LinkedIn's API — an edited excerpt, cover image or
 * document on an already-shared post has no API path to reflect there; only
 * the text does, which is why a title change also carries the blog URL again
 * when the live post is a document share (see lib/linkedin/content.ts).
 */
async function syncLinkedInCommentary(
  request: Request,
  state: LinkedInPostState,
  urn: string,
): Promise<void> {
  try {
    const account = await getLinkedInAccount(request.headers);
    if (!account) return;

    const { commentary } = buildLinkedInContent(state);

    await updateLinkedInPostCommentary({
      headers: request.headers,
      accountId: account.accountId,
      urn,
      commentary,
    });
  } catch (error) {
    console.error(
      "[posts/edit] LinkedIn commentary update failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

async function removeFromLinkedInBestEffort(
  request: Request,
  id: string,
  urn: string,
): Promise<void> {
  try {
    const account = await getLinkedInAccount(request.headers);
    if (!account) return;

    await deleteLinkedInPost({ headers: request.headers, accountId: account.accountId, urn });
  } catch (error) {
    console.error(
      `[posts/delete] LinkedIn delete failed for ${id}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
