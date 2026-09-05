"use client";

import React, { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Choosing what a published post shares to LinkedIn as, beyond the default
 * plain link preview: one image, or one document (PDF, DOC, PPT — whatever
 * LinkedIn's own document post accepts).
 *
 * Uploads on file select, immediately — see the route this posts to for why
 * that's safe to do before the post is even published. If the post is
 * already live on LinkedIn, the upload also replaces that post right away;
 * the "relinked" flag in the response is only used to word the confirmation.
 */

type Attachment = { kind: "image" | "document" } | null;

export function LinkedInAttachmentField({
  postId,
  initial,
}: {
  postId: string;
  initial: Attachment;
}) {
  const [attachment, setAttachment] = useState<Attachment>(initial);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);

  async function upload(kind: "image" | "document", file: File) {
    setState("busy");
    setNote(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-attachment`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "That didn't upload.");
        return;
      }

      setAttachment({ kind });
      setState("idle");
      setNote(
        result.relinked
          ? "Updated — the live LinkedIn post now uses this."
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
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-attachment`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "Couldn't remove that.");
        return;
      }

      setAttachment(null);
      setState("idle");
      setNote(
        result.relinked
          ? "Removed — the live LinkedIn post now shows a link preview instead."
          : "Removed.",
      );
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  const busy = state === "busy";

  return (
    <div className="rounded-[var(--radius)] border border-line p-4">
      <p className="text-sm font-medium text-ink">LinkedIn attachment</p>
      <p className="mt-1 text-sm text-ink-muted">
        {attachment
          ? `${attachment.kind === "image" ? "Image" : "Document"} attached — shared instead of a link preview.`
          : "None. Shares as a link preview by default."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload("image", file);
          }}
        />
        <input
          ref={documentInput}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload("document", file);
          }}
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => imageInput.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImageIcon />}
          {attachment?.kind === "image" ? "Replace image" : "Attach image"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => documentInput.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <FileText />}
          {attachment?.kind === "document" ? "Replace document" : "Attach document"}
        </Button>

        {attachment ? (
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
