"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { SignInButton } from "@/components/auth/SignInButton";
import { useSession } from "@/lib/auth/client";

/**
 * The composer, for a new comment or a reply.
 *
 * Uncontrolled, like every other form here: the value lives in the DOM and
 * `FormData` reads it on submit. For a textarea someone may type paragraphs into,
 * that is the difference between one render and several hundred.
 *
 * On success it calls `router.refresh()` rather than inserting the comment into a
 * local list. The thread is server-rendered, so refreshing pulls the real one
 * back — which means the comment on screen is the comment in the database, with
 * its real timestamp and status, rather than a hopeful copy.
 *
 * The exception is a comment held for approval, where a refresh would show
 * nothing to anyone but its author. That case gets an explicit note instead,
 * because a comment that silently vanishes reads as a bug.
 */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "pending" }
  | { kind: "error"; message: string };

export function CommentForm({
  slug,
  parentId,
  canComment,
  compact = false,
}: {
  slug: string;
  /** Present for a reply. The post is inherited from the parent server-side. */
  parentId?: string;
  canComment: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);
  const formRef = useRef<HTMLFormElement>(null);

  if (!canComment) {
    return (
      <p className="text-sm text-ink-subtle">
        Comments aren&apos;t available right now.
      </p>
    );
  }

  // Nothing rather than a flash of the wrong state while the session resolves.
  if (isPending) return <div className="h-10" aria-hidden />;

  if (!session?.user) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          {parentId ? "Sign in to reply." : "Sign in to join the conversation."}
        </p>
        <SignInButton size="sm" callbackURL={`/blog/${slug}`} />
      </div>
    );
  }

  if (compact && !open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Reply
      </Button>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");

    setStatus({ kind: "sending" });
    setFieldError(null);

    try {
      const response = await fetch(`/api/blog/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, ...(parentId ? { parentId } : {}) }),
      });
      const result = await response.json();

      if (!result.success) {
        setFieldError(result.fieldErrors?.body?.[0] ?? null);
        setStatus({
          kind: "error",
          message: result.error ?? "That didn't post.",
        });
        return;
      }

      form.reset();

      if (result.pending) {
        setStatus({ kind: "pending" });
        return;
      }

      setStatus({ kind: "idle" });
      if (compact) setOpen(false);
      // Pull the server's thread back, so what is on screen is what was stored.
      router.refresh();
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Your text is still here.",
      });
    }
  }

  const sending = status.kind === "sending";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Textarea
        id={parentId ? `reply-${parentId}` : "comment"}
        name="body"
        rows={compact ? 3 : 4}
        required
        disabled={sending}
        error={fieldError ? [fieldError] : undefined}
        placeholder={parentId ? "Write a reply…" : "Say something…"}
        aria-label={parentId ? "Your reply" : "Your comment"}
      />

      {fieldError ? (
        <p
          id={`${parentId ? `reply-${parentId}` : "comment"}-error`}
          role="alert"
          className="text-sm text-accent"
        >
          {fieldError}
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}

      {status.kind === "pending" ? (
        <p role="status" className="text-sm text-ink-muted">
          Thanks — that&apos;s waiting for approval and will appear once it is
          reviewed.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {parentId ? "Reply" : "Post comment"}
        </Button>

        {compact ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={sending}
            onClick={() => {
              setOpen(false);
              setStatus({ kind: "idle" });
            }}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
