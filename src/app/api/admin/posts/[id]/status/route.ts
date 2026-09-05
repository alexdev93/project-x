import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import {
  getPostForAdmin,
  publishPost,
  setPinnedPost,
  unpublishPost,
} from "@/lib/db/posts";
import { revalidateFeed, revalidatePost } from "@/lib/blog/invalidate";
import { getLinkedInAccount } from "@/lib/linkedin/account";
import { shareLinkOnLinkedIn } from "@/lib/linkedin/share";
import { absoluteUrl } from "@/lib/site";
import {
  checkRequest,
  databaseError,
  errorResponse,
  notFound,
  okResponse,
} from "@/lib/http/guards";

/**
 * Publishing, unpublishing and pinning.
 *
 * Separate from the editor's PATCH on purpose: publishing is a deliberate act,
 * not a side effect of pressing save. Keeping it here means a draft can be
 * edited freely without any chance of it going live, and it gives publication
 * its own audit point and its own cache invalidation.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["publish", "unpublish", "pin", "unpin"]),
});

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  const checked = await checkRequest(request);
  if (checked.response) return checked.response;

  const parsed = actionSchema.safeParse(checked.body);
  if (!parsed.success) return errorResponse(400, "Unknown action.");

  try {
    switch (parsed.data.action) {
      case "publish": {
        // Read before publishing: this is the only way to tell a genuine
        // draft -> published transition from a click on an already-published
        // post, which `publishPost` itself treats identically (see its own
        // comment on `published_at`). Only the former should ever post to
        // LinkedIn — a re-publish must not share the same post twice.
        const before = await getPostForAdmin(params.id);

        const published = await publishPost(params.id);
        if (!published) return notFound();

        revalidatePost(published.slug);
        revalidateFeed();

        const linkedIn = await shareNewlyPublishedPost({
          request,
          wasAlreadyPublished: before?.status === "published",
          slug: published.slug,
          title: before?.title || published.slug,
          excerpt: before?.excerpt,
        });

        return okResponse({
          status: "published",
          slug: published.slug,
          publishedAt: published.publishedAt.toISOString(),
          linkedIn,
        });
      }

      case "unpublish": {
        const drafted = await unpublishPost(params.id);
        if (!drafted) return notFound();

        // The public page must stop resolving immediately, so the post's own
        // path is invalidated as well as the feed.
        revalidatePost(drafted.slug);
        revalidateFeed();
        return okResponse({ status: "draft", slug: drafted.slug });
      }

      case "pin":
      case "unpin": {
        const pin = parsed.data.action === "pin";
        const changed = await setPinnedPost(params.id, pin);

        // Pinning touches the incumbent as well as the target, so an empty
        // result is the only way to tell the post does not exist.
        if (changed.length === 0) return notFound();

        revalidateFeed();
        for (const row of changed) revalidatePost(row.slug);

        return okResponse({
          pinned: changed.find((row) => row.id === params.id)?.pinned ?? false,
        });
      }
    }
  } catch (error) {
    return databaseError(error, "admin/posts/[id]/status");
  }
}

type LinkedInShareResult = "shared" | "not_connected" | "skipped" | "failed";

/**
 * Best effort, by design: a LinkedIn hiccup must never fail the publish
 * itself, since the post is already live on the site by the time this runs.
 * The caller surfaces the result so the UI can say so when it doesn't work,
 * rather than the owner discovering it wasn't shared some other way.
 */
async function shareNewlyPublishedPost({
  request,
  wasAlreadyPublished,
  slug,
  title,
  excerpt,
}: {
  request: Request;
  wasAlreadyPublished: boolean;
  slug: string;
  title: string;
  excerpt?: string;
}): Promise<LinkedInShareResult> {
  if (wasAlreadyPublished) return "skipped";

  try {
    const account = await getLinkedInAccount(request.headers);
    if (!account) return "not_connected";

    await shareLinkOnLinkedIn({
      headers: request.headers,
      accountId: account.accountId,
      memberId: account.memberId,
      commentary: title,
      url: absoluteUrl(`/blog/${slug}`),
      title,
      description: excerpt,
    });

    return "shared";
  } catch (error) {
    console.error(
      `[posts/publish] LinkedIn share failed for ${slug}:`,
      error instanceof Error ? error.message : error,
    );
    return "failed";
  }
}
