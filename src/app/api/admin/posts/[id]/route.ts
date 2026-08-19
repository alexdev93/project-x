import { requireAdmin } from "@/lib/auth/session";
import { postInputSchema } from "@/lib/blog/schema";
import { excerpt, readingMinutes } from "@/lib/blog/text";
import { deletePost, updatePost } from "@/lib/db/posts";
import { revalidateFeed, revalidatePost } from "@/lib/blog/invalidate";
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

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
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

    return okResponse({ post: updated });
  } catch (error) {
    return databaseError(error, "admin/posts/[id]");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  // A DELETE carries no body, so there is nothing to parse or size-check — but
  // it is still a state change, so the cross-origin rule applies. Checked
  // directly rather than through checkRequest, which would also demand a JSON
  // content type that a bodyless request has no reason to send.
  if (!sameOrigin(request)) return errorResponse(400, "Invalid request.");

  try {
    const deleted = await deletePost(params.id);
    if (!deleted) return notFound();

    // Comments and reactions went with it, by ON DELETE CASCADE.
    revalidatePost(deleted.slug);
    revalidateFeed();

    return okResponse({ deleted: deleted.slug });
  } catch (error) {
    return databaseError(error, "admin/posts/[id]");
  }
}
