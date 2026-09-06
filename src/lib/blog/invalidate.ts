import { revalidatePath, revalidateTag } from "next/cache";
import { POSTS_TAG } from "./service";

/**
 * Cache invalidation after a write.
 *
 * Both mechanisms are used together on every mutation, and that is deliberate
 * rather than superstitious. `revalidateTag` reliably purges the *data* cache
 * entries the read helpers create; what is less certain in Next 14.2 is whether
 * that propagates to the *full-route* cache of a page that was prerendered at
 * build time. `revalidatePath` targets the route cache directly. Using both
 * costs nothing and removes the question.
 *
 * `revalidateTag`'s second argument is `{ expire: 0 }`, not `"max"`: every
 * call here runs right after an admin write, and the point is that the
 * change is correct on the very next request, not eventually. `"max"` would
 * serve stale, pre-edit content for up to a year while revalidating in the
 * background, which is exactly what publishing or editing a post should not do.
 *
 * The path list is hand-maintained, which is a wart, but it is the same wart
 * `staticRoutes` in src/app/sitemap.ts already carries, and the two should be
 * reviewed together when a route is added.
 *
 * Every function is safe to call from a route handler and does nothing at build
 * time.
 */

/** After publish, unpublish, pin, delete, or a create that could reuse a slug. */
export function revalidateFeed(): void {
  revalidateTag(POSTS_TAG, { expire: 0 });
  revalidatePath("/blog");
  // The home page carries a strip of recent posts.
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

/** After an edit to one post's own content. */
export function revalidatePost(slug: string): void {
  revalidateTag(POSTS_TAG, { expire: 0 });
  revalidatePath(`/blog/${slug}`);
}

/**
 * After a comment is written, approved, hidden or removed.
 *
 * Only the post's own page: a comment does not change the feed, and the count
 * shown on a feed card is allowed to lag until the next feed revalidation.
 * That is a deliberate trade, since invalidating the whole feed on every
 * comment would throw away the cached HTML of every post for a number
 * nobody reads closely.
 */
export function revalidateThread(slug: string): void {
  revalidatePath(`/blog/${slug}`);
}
