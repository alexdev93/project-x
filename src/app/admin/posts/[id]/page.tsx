import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PostEditor } from "@/components/admin/PostEditor";
import { getPostForAdmin } from "@/lib/db/posts";
import { hasBlog } from "@/lib/blog/config";
import { requireAdminPage } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

/**
 * Editing one post.
 *
 * Uses `getPostForAdmin`, which is deliberately a different function from the
 * public read: it applies no status filter, so a draft is editable here and
 * invisible everywhere else. Two names for the two audiences means no query can
 * accidentally serve the wrong one.
 */

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminPage();

  if (!hasBlog()) notFound();

  const post = await getPostForAdmin(params.id).catch((error) => {
    console.error(
      "[admin] post read failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  });

  if (!post) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl text-ink">Edit post</h1>

          {post.status === "published" ? (
            <Link
              href={`/blog/${post.slug}`}
              className="flex items-center gap-1.5 text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              <ExternalLink aria-hidden className="size-4" />
              View on the site
            </Link>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-ink-muted">
          {post.status === "published"
            ? `Published ${formatDateTime(post.publishedAt ?? post.createdAt)}. Saved changes go live immediately.`
            : "This is a draft. Publish it from the post list when it is ready."}
        </p>
      </header>

      <PostEditor post={post} />
    </div>
  );
}
