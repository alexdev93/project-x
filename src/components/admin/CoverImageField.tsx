"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * The post's cover image: shown at the top of the post itself, and used as
 * its link-preview image everywhere it's shared — LinkedIn included, as the
 * thumbnail on its article card (see lib/linkedin/content.ts). One image, one
 * field, no separate "LinkedIn image" to keep in sync with it.
 *
 * Uploads immediately on file select, same reasoning as the LinkedIn document
 * field: if the post is already live on LinkedIn, this also replaces that
 * post right away.
 */

export function CoverImageField({
  postId,
  initialUrl,
}: {
  postId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setState("busy");
    setNote(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/cover-image`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "That didn't upload.");
        return;
      }

      setUrl(result.url);
      setState("idle");
      setNote(
        result.relinked
          ? "Updated — the live LinkedIn post now uses this."
          : "Saved.",
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
      const response = await fetch(`/api/admin/posts/${postId}/cover-image`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "Couldn't remove that.");
        return;
      }

      setUrl(null);
      setState("idle");
      setNote(result.relinked ? "Removed — the live LinkedIn post now shows a plain link." : null);
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  const busy = state === "busy";

  return (
    <div className="rounded-[var(--radius)] border border-line p-4">
      <p className="text-sm font-medium text-ink">Cover image</p>
      <p className="mt-1 text-sm text-ink-muted">
        Shown at the top of the post, and used as its link preview image
        wherever it&apos;s shared.
      </p>

      {url ? (
        // A per-post external URL — see ProjectMarkdown for the same call.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="mt-3 aspect-[16/9] w-full max-w-sm rounded-[var(--radius)] border border-line object-cover"
        />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
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
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {url ? "Replace image" : "Add image"}
        </Button>

        {url ? (
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
