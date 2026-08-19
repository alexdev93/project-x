import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { publishPost, setPinnedPost, unpublishPost } from "@/lib/db/posts";
import { revalidateFeed, revalidatePost } from "@/lib/blog/invalidate";
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
        const published = await publishPost(params.id);
        if (!published) return notFound();

        revalidatePost(published.slug);
        revalidateFeed();
        return okResponse({
          status: "published",
          slug: published.slug,
          publishedAt: published.publishedAt.toISOString(),
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
