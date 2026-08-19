"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";
import type { ModerationItem } from "@/lib/blog/types";

/**
 * Approve, hide, or remove a comment.
 *
 * The rows are handed over by the server and owned here afterwards, so an action
 * updates the one row it touched instead of refetching the list.
 *
 * Deleting removes replies with it, by the self-referencing cascade, so the
 * confirmation says so — that is the one case where taking the replies is the
 * intent rather than a surprise.
 *
 * Bodies render as plain text here for the same reason they do on the public
 * page: a moderation screen that renders markup would be the worst possible place
 * to have a scripting hole, since it is only ever viewed by the one account that
 * matters.
 */

type Busy = { id: string; action: string } | null;

export function CommentQueue({
  initialComments,
}: {
  initialComments: ModerationItem[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function moderate(id: string, action: "approve" | "hide") {
    setBusy({ id, action });
    setErrors((e) => ({ ...e, [id]: "" }));

    try {
      const response = await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();

      if (!result.success) {
        setErrors((e) => ({ ...e, [id]: result.error ?? "That didn't work." }));
        return;
      }

      setComments((current) =>
        current.map((row) =>
          row.id === id ? { ...row, status: result.status } : row,
        ),
      );
    } catch {
      setErrors((e) => ({ ...e, [id]: "Couldn't reach the server." }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: ModerationItem) {
    if (
      !window.confirm(
        `Delete this comment from ${item.authorName}? Any replies to it go too.`,
      )
    ) {
      return;
    }

    setBusy({ id: item.id, action: "delete" });

    try {
      const response = await fetch(`/api/admin/comments/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (!result.success) {
        setErrors((e) => ({
          ...e,
          [item.id]: result.error ?? "That didn't work.",
        }));
        return;
      }

      setComments((current) => current.filter((row) => row.id !== item.id));
    } catch {
      setErrors((e) => ({ ...e, [item.id]: "Couldn't reach the server." }));
    } finally {
      setBusy(null);
    }
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
        <p className="text-ink">No comments yet.</p>
        <p className="mt-1 text-sm text-ink-muted">
          They will appear here as readers leave them.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((item) => {
        const rowBusy = busy?.id === item.id;

        return (
          <li
            key={item.id}
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar name={item.authorName} src={item.authorImage} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{item.authorName}</p>
                  <span className="text-xs text-ink-subtle">
                    {relativeTime(item.createdAt)}
                  </span>
                  {item.status === "pending" ? (
                    <Badge tone="accent">Waiting</Badge>
                  ) : null}
                  {item.status === "hidden" ? <Badge tone="quiet">Hidden</Badge> : null}
                  {item.parentId ? <Badge tone="quiet">Reply</Badge> : null}
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                  {item.body}
                </p>

                <Link
                  href={`/blog/${item.postSlug}`}
                  className="mt-2 inline-block text-xs text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
                >
                  on “{item.postTitle || item.postSlug}”
                </Link>

                {errors[item.id] ? (
                  <p role="alert" className="mt-2 text-sm text-accent">
                    {errors[item.id]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {item.status !== "visible" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rowBusy}
                  onClick={() => moderate(item.id, "approve")}
                >
                  {rowBusy && busy?.action === "approve" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Approve
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rowBusy}
                  onClick={() => moderate(item.id, "hide")}
                >
                  {rowBusy && busy?.action === "hide" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <EyeOff />
                  )}
                  Hide
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-ink-subtle hover:text-accent"
                disabled={rowBusy}
                onClick={() => remove(item)}
              >
                {rowBusy && busy?.action === "delete" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
