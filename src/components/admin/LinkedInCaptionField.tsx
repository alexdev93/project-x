"use client";

import React, { useRef, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

/**
 * The actual LinkedIn post text — independent of the post's title, because a
 * LinkedIn caption reads nothing like a blog headline (hashtags, mentions, a
 * call to action, line breaks). Left empty, the title is used instead (see
 * lib/linkedin/content.ts).
 *
 * Its own explicit Save button, not autosave-on-blur: unlike a file picker,
 * there's no natural "I'm done" moment in a text field, and autosaving every
 * blur while drafting a caption would fire a LinkedIn sync mid-thought.
 */

const MAX_LENGTH = 3000;

export function LinkedInCaptionField({
  postId,
  initialCommentary,
}: {
  postId: string;
  initialCommentary: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function save() {
    const commentary = textareaRef.current?.value ?? "";

    setState("busy");
    setNote(null);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentary }),
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "That didn't save.");
        return;
      }

      setState("idle");
      setNote(result.synced ? "Updated - the live LinkedIn post now uses this." : "Saved.");
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  const busy = state === "busy";

  return (
    <div className="rounded-[var(--radius)] border border-line p-4">
      <p className="text-sm font-medium text-ink">Caption</p>
      <p className="mt-1 text-sm text-ink-muted">
        What LinkedIn actually shows as the post text. Left empty, the title
        is used instead.
      </p>

      <Textarea
        ref={textareaRef}
        id="linkedin-commentary"
        rows={6}
        defaultValue={initialCommentary}
        disabled={busy}
        maxLength={MAX_LENGTH}
        placeholder="Write the post the way you'd actually post it on LinkedIn - hashtags, mentions, line breaks all work. The blog link is added automatically."
        className="mt-3"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}
          Save caption
        </Button>

        {note ? (
          <p
            role="status"
            className={`flex items-center gap-1.5 text-sm ${state === "error" ? "text-accent" : "text-ink-muted"}`}
          >
            {state !== "error" ? <Check aria-hidden className="size-4" /> : null}
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
