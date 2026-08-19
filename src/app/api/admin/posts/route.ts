import { requireAdmin } from "@/lib/auth/session";
import { postInputSchema } from "@/lib/blog/schema";
import { excerpt, readingMinutes } from "@/lib/blog/text";
import { createPost, listAllPosts } from "@/lib/db/posts";
import { revalidateFeed } from "@/lib/blog/invalidate";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
} from "@/lib/http/guards";

/**
 * Listing and creating posts.
 *
 * `requireAdmin(request)` is called here, in this handler, and not inherited
 * from anywhere. The admin layout's guard does not run for route handlers and
 * the middleware only checks that a cookie exists — so this line is the actual
 * boundary, and the same line appears at the top of every sibling. It is
 * repetition on purpose: a shared wrapper is a thing a future handler can forget
 * to use, and the failure would be silent.
 *
 * Note the ordering below: the authorization check precedes every data-layer
 * call, which is asserted in the tests by requiring the database mock to be
 * untouched on a refusal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  try {
    return okResponse({ posts: await listAllPosts() });
  } catch (error) {
    return databaseError(error, "admin/posts");
  }
}

export async function POST(request: Request) {
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
    const created = await createPost({
      slug,
      title,
      body,
      // Derived when the author has not written one, so a feed card always has
      // something to show. Stored rather than computed on read so the owner can
      // overwrite it with something better than a truncation.
      excerpt: parsed.data.excerpt || excerpt(body),
      tags,
      readingMinutes: readingMinutes(body),
    });

    // A new post is a draft, so no public page changes yet — but the admin list
    // is served fresh anyway, and revalidating keeps the feed honest if a slug
    // was reused after a delete.
    revalidateFeed();

    return okResponse({ post: created }, 201);
  } catch (error) {
    return databaseError(error, "admin/posts");
  }
}
