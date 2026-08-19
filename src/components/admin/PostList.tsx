"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Pin, PinOff, Send, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { Post } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/**
 * The post table, with its row actions.
 *
 * State is owned here after the server hands over the first render. Each action
 * patches the one row it changed from the endpoint's response, so the list never
 * refetches and never flickers — and because pinning can also *unpin* a
 * different row, the pin action clears the flag locally on every other post to
 * match what the single SQL statement did on the server.
 *
 * Errors are shown against the row that failed rather than as a page-level
 * banner, since the useful question is always "which one didn't work".
 */

type Busy = { id: string; action: string } | null;

export function PostList({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function act(post: Post, action: "publish" | "unpublish" | "pin" | "unpin") {
    setBusy({ id: post.id, action });
    setErrors((current) => ({ ...current, [post.id]: "" }));

    try {
      const response = await fetch(`/api/admin/posts/${post.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();

      if (!result.success) {
        setErrors((current) => ({
          ...current,
          [post.id]: result.error ?? "That didn't work.",
        }));
        return;
      }

      setPosts((current) =>
        current.map((row) => {
          if (row.id !== post.id) {
            // A pin unpins whatever was pinned before, in the same statement.
            return action === "pin" ? { ...row, pinned: false } : row;
          }

          return {
            ...row,
            status: result.status ?? row.status,
            pinned: result.pinned ?? (action === "pin" ? true : row.pinned),
            publishedAt: result.publishedAt
              ? new Date(result.publishedAt)
              : row.publishedAt,
          };
        }),
      );
    } catch {
      setErrors((current) => ({
        ...current,
        [post.id]: "Couldn't reach the server.",
      }));
    } finally {
      setBusy(null);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
        <p className="text-ink">Nothing written yet.</p>
        <p className="mt-1 text-sm text-ink-muted">
          The first post is the hardest. Start with something short.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {posts.map((post) => {
        const published = post.status === "published";
        const rowBusy = busy?.id === post.id;

        return (
          <li
            key={post.id}
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="truncate font-medium text-ink underline-offset-4 hover:underline"
                >
                  {post.title || post.slug}
                </Link>

                {published ? (
                  <Badge>Published</Badge>
                ) : (
                  <Badge tone="quiet">Draft</Badge>
                )}

                {post.pinned ? <Badge tone="accent">Pinned</Badge> : null}
              </div>

              {/* Wraps rather than truncates: this line is three short facts,
                  and clipping the last one mid-word to save a row reads as a
                  layout bug. */}
              <p className="mt-1 text-sm text-ink-subtle">
                /{post.slug}
                {" · "}
                {post.publishedAt
                  ? `published ${relativeTime(post.publishedAt)}`
                  : `created ${relativeTime(post.createdAt)}`}
                {" · "}
                <span title={formatDateTime(post.updatedAt)}>
                  edited {relativeTime(post.updatedAt)}
                </span>
              </p>

              {errors[post.id] ? (
                <p role="alert" className="mt-2 text-sm text-accent">
                  {errors[post.id]}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {published ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rowBusy}
                  onClick={() => act(post, post.pinned ? "unpin" : "pin")}
                  aria-label={post.pinned ? "Unpin this post" : "Pin this post"}
                >
                  {rowBusy && busy?.action.includes("pin") ? (
                    <Loader2 className="animate-spin" />
                  ) : post.pinned ? (
                    <PinOff />
                  ) : (
                    <Pin />
                  )}
                  <span className="hidden sm:inline">
                    {post.pinned ? "Unpin" : "Pin"}
                  </span>
                </Button>
              ) : null}

              {published ? (
                <Link
                  href={`/blog/${post.slug}`}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-[var(--radius)] px-3 text-sm",
                    "text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink",
                  )}
                >
                  <ExternalLink aria-hidden className="size-4" />
                  <span className="hidden sm:inline">View</span>
                </Link>
              ) : null}

              <Button
                variant={published ? "secondary" : "primary"}
                size="sm"
                disabled={rowBusy}
                onClick={() => act(post, published ? "unpublish" : "publish")}
              >
                {rowBusy && !busy?.action.includes("pin") ? (
                  <Loader2 className="animate-spin" />
                ) : published ? (
                  <Undo2 />
                ) : (
                  <Send />
                )}
                {published ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
