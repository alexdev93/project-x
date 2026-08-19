"use client";

import React, { useState } from "react";
import { Ban, Loader2, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import type { BlogUser } from "@/lib/blog/types";

/**
 * Readers, with a block toggle.
 *
 * The owner's own row carries no block control. That is a UX guard against a
 * pointless mistake, not a security one — the endpoint refuses it too, because
 * the button being absent is not a reason for the server to trust the request.
 */
export function UserTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: BlogUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggleBlock(user: BlogUser) {
    if (
      !user.blocked &&
      !window.confirm(`Stop ${user.name} from posting new comments?`)
    ) {
      return;
    }

    setBusy(user.id);
    setErrors((e) => ({ ...e, [user.id]: "" }));

    try {
      const response = await fetch(`/api/admin/users/${user.id}/block`, {
        method: user.blocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(user.blocked ? {} : { body: JSON.stringify({ reason: "" }) }),
      });
      const result = await response.json();

      if (!result.success) {
        setErrors((e) => ({
          ...e,
          [user.id]: result.error ?? "That didn't work.",
        }));
        return;
      }

      setUsers((current) =>
        current.map((row) =>
          row.id === user.id ? { ...row, blocked: result.blocked } : row,
        ),
      );
    } catch {
      setErrors((e) => ({ ...e, [user.id]: "Couldn't reach the server." }));
    } finally {
      setBusy(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
        <p className="text-ink">Nobody has signed in yet.</p>
        <p className="mt-1 text-sm text-ink-muted">
          Readers appear here the first time they sign in to comment.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={user.name} src={user.image} size="md" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                {user.blocked ? <Badge tone="accent">Blocked</Badge> : null}
                {user.id === currentUserId ? <Badge tone="quiet">You</Badge> : null}
              </div>

              <p className="truncate text-sm text-ink-subtle">{user.email}</p>
              <p className="text-xs text-ink-subtle">
                joined {formatDate(user.createdAt)} · {user.commentCount}{" "}
                {user.commentCount === 1 ? "comment" : "comments"}
              </p>

              {errors[user.id] ? (
                <p role="alert" className="mt-1 text-sm text-accent">
                  {errors[user.id]}
                </p>
              ) : null}
            </div>
          </div>

          {user.id === currentUserId ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-ink-subtle hover:text-accent"
              disabled={busy === user.id}
              onClick={() => toggleBlock(user)}
            >
              {busy === user.id ? (
                <Loader2 className="animate-spin" />
              ) : user.blocked ? (
                <Undo2 />
              ) : (
                <Ban />
              )}
              {user.blocked ? "Unblock" : "Block"}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
