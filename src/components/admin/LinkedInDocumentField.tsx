"use client";

import React, { useRef, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * An optional document (PDF, DOC, PPT) shared instead of the default article
 * link preview. LinkedIn-only by design, unlike the cover image — there's no
 * portfolio-side equivalent of a "document post" to unify it with. Because a
 * document takes over the post's content, the URL back to this site moves
 * into the share's text instead — see lib/linkedin/content.ts.
 */

export function LinkedInDocumentField({
  postId,
  initialAttached,
}: {
  postId: string;
  initialAttached: boolean;
}) {
  const [attached, setAttached] = useState(initialAttached);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setState("busy");
    setNote(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-document`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "That didn't upload.");
        return;
      }

      setAttached(true);
      setState("idle");
      setNote(
        result.relinked
          ? "Updated — the live LinkedIn post now shares this document instead."
          : "Saved. Used the next time this post is published.",
      );
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  async function remove() {
    setState("busy");
    setNote(null);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-document`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "Couldn't remove that.");
        return;
      }

      setAttached(false);
      setState("idle");
      setNote(
        result.relinked ? "Removed — the live LinkedIn post shares as a link again." : null,
      );
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  const busy = state === "busy";

  return (
    <div className="rounded-[var(--radius)] border border-line p-4">
      <p className="text-sm font-medium text-ink">LinkedIn document</p>
      <p className="mt-1 text-sm text-ink-muted">
        {attached
          ? "Document attached — shared instead of the article link preview."
          : "None. Shares with the cover image and a link preview by default."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload(file);
          }}
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <FileText />}
          {attached ? "Replace document" : "Attach document"}
        </Button>

        {attached ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={remove}
            className="text-ink-subtle hover:text-accent"
          >
            <X />
            Remove
          </Button>
        ) : null}
      </div>

      {note ? (
        <p
          role="status"
          className={`mt-2 text-sm ${state === "error" ? "text-accent" : "text-ink-muted"}`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
