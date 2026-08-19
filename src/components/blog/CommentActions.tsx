"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useSession } from "@/lib/auth/client";

/**
 * Edit and withdraw, on one's own comment.
 *
 * Rendered for every comment and shown for none of them until the session
 * resolves in the browser and says which are the reader's own. That indirection
 * exists so the post page never reads the session on the server: doing so would
 * opt a cached, prerendered article out of static rendering purely to decide
 * which two links to draw.
 *
 * These controls are a **convenience, not a permission**. Whether an edit is
 * allowed is decided by the SQL — the statement carries the author id and the
 * time window in its `WHERE` — so hiding the button is only about not offering
 * something that would fail. A visitor who calls the endpoint directly meets the
 * same predicate and gets the same 404.
 *
 * The edit window is checked here too, against the timestamp the server rendered,
 * so the button disappears when it expires rather than waiting to fail on click.
 * Client clocks drift, which is why this is the softer of the two checks and the
 * database keeps the authoritative one.
 */

const EDIT_WINDOW_MINUTES = 15;

export function CommentActions({
  authorId,
  comment,
}: {
  authorId: string;
  comment: {
    id: string;
    body: string;
    /** ISO — a Date cannot cross the server/client boundary as itself. */
    createdAt: string;
  };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = session?.user?.id === authorId;
  const age = Date.now() - new Date(comment.createdAt).getTime();
  const editable = age <= EDIT_WINDOW_MINUTES * 60_000;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "");

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(
          response.status === 404
            ? "That can no longer be edited."
            : (result.error ?? "That didn't save."),
        );
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!window.confirm("Withdraw this comment?")) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/comments/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? "That didn't work.");
        return;
      }

      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  // Someone else's comment, or nobody signed in.
  if (!mine) return null;

  if (editing) {
    return (
      <form onSubmit={save} className="mt-3 flex flex-col gap-2">
        <Textarea
          name="body"
          rows={3}
          defaultValue={comment.body}
          disabled={busy}
          aria-label="Edit your comment"
        />
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      {editable ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-ink-subtle underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Edit
        </button>
      ) : null}

      <button
        type="button"
        onClick={withdraw}
        disabled={busy}
        className="text-xs text-ink-subtle underline-offset-4 transition-colors hover:text-accent hover:underline disabled:opacity-60"
      >
        Withdraw
      </button>

      {error ? (
        <span role="alert" className="text-xs text-accent">
          {error}
        </span>
      ) : null}
    </div>
  );
}
