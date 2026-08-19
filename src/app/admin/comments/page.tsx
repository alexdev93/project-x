import React from "react";
import { CommentQueue } from "@/components/admin/CommentQueue";
import { requireAdminPage } from "@/lib/auth/session";
import { hasBlog } from "@/lib/blog/config";
import { listCommentsForModeration } from "@/lib/db/comments";
import type { ModerationItem } from "@/lib/blog/types";

/**
 * The moderation queue.
 *
 * Anything waiting for approval sorts to the top, because that is the reason to
 * open this page. Everything else is listed underneath so a comment can be hidden
 * after the fact without hunting for the post it is on.
 */

export default async function AdminCommentsPage() {
  await requireAdminPage();

  const comments = await read();
  const pending = comments.filter((c) => c.status === "pending").length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Comments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {pending > 0
            ? `${pending} waiting for you.`
            : "Nothing waiting. Recent comments are listed below."}
        </p>
      </header>

      <CommentQueue initialComments={comments} />
    </div>
  );
}

async function read(): Promise<ModerationItem[]> {
  if (!hasBlog()) return [];

  try {
    return await listCommentsForModeration(100);
  } catch (error) {
    console.error(
      "[admin] moderation queue failed:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
