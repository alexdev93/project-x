import React from "react";
import { PenLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PostList } from "@/components/admin/PostList";
import { hasBlog } from "@/lib/blog/config";
import { listAllPosts } from "@/lib/db/posts";
import { requireAdminPage } from "@/lib/auth/session";
import type { Post } from "@/lib/blog/types";

/**
 * Every post, drafts included.
 *
 * The initial rows are server-rendered and handed to a client component, which
 * then owns them: publishing or pinning updates the row in place from the
 * response rather than refetching the list. One round trip per action instead of
 * two, and the table never flickers.
 */

export default async function AdminPostsPage() {
  await requireAdminPage();

  const posts = await readPosts();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Posts</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Drafts are visible only here. Publishing puts a post on the site
            straight away.
          </p>
        </div>

        <ButtonLink href="/admin/posts/new">
          <PenLine />
          Write a post
        </ButtonLink>
      </header>

      <PostList initialPosts={posts} />
    </div>
  );
}

async function readPosts(): Promise<Post[]> {
  if (!hasBlog()) return [];

  try {
    return await listAllPosts();
  } catch (error) {
    console.error(
      "[admin] post list failed:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
