"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Photos beyond the cover image — LinkedIn's real multi-photo carousel, not
 * a gallery on the post itself. LinkedIn-only, same reasoning as the
 * document field: there's no portfolio-side gallery for these to also
 * appear in, so nothing is stored here but the LinkedIn asset URN (see
 * lib/linkedin/content.ts and schema.sql's post_linkedin_images note).
 *
 * A gallery only exists on top of a cover image — it's always the first
 * photo — so this whole field is disabled until one is set.
 *
 * No live thumbnails for photos already saved: they live only on LinkedIn's
 * side, and fetching each one back just to preview it here would be a
 * LinkedIn API call per photo per page load for a feature nobody but the
 * author sees. A photo just uploaded gets an in-browser preview for the rest
 * of this visit (free — no server round trip) using the file the browser
 * already has; reloading the page shows a plain placeholder instead, same
 * fidelity as the document field's "attached" state.
 */

type Image = { urn: string; altText: string; previewUrl?: string };

const MAX_EXTRA_IMAGES = 8;

export function LinkedInGalleryField({
  postId,
  hasCoverImage,
  initialImages,
}: {
  postId: string;
  hasCoverImage: boolean;
  initialImages: { urn: string; altText: string }[];
}) {
  const [images, setImages] = useState<Image[]>(initialImages);
  const [altText, setAltText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setState("busy");
    setNote(null);

    const previewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-images`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "That didn't upload.");
        URL.revokeObjectURL(previewUrl);
        return;
      }

      const uploaded: { urn: string; altText: string }[] = result.images;
      setImages(
        uploaded.map((image, i) =>
          i === uploaded.length - 1 ? { ...image, previewUrl } : image,
        ),
      );
      setAltText("");
      setState("idle");
      setNote(
        result.relinked
          ? "Updated — the live LinkedIn post now includes this."
          : "Saved. Used the next time this post is published.",
      );
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function remove(index: number) {
    setState("busy");
    setNote(null);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/linkedin-images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const result = await response.json();

      if (!result.success) {
        setState("error");
        setNote(result.error ?? "Couldn't remove that.");
        return;
      }

      const removed = images[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);

      const uploaded: { urn: string; altText: string }[] = result.images;
      setImages((current) =>
        uploaded.map((image, i) => ({ ...image, previewUrl: current[i]?.previewUrl })),
      );
      setState("idle");
      setNote(result.relinked ? "Removed — the live LinkedIn post is updated." : "Removed.");
    } catch {
      setState("error");
      setNote("Couldn't reach the server.");
    }
  }

  const busy = state === "busy";
  const atMax = images.length >= MAX_EXTRA_IMAGES;

  return (
    <div className="rounded-[var(--radius)] border border-line p-4">
      <p className="text-sm font-medium text-ink">Additional photos</p>
      <p className="mt-1 text-sm text-ink-muted">
        {hasCoverImage
          ? "Shown as LinkedIn's own photo carousel, alongside the cover image. LinkedIn-only — not shown on the post itself."
          : "Add a cover image first — it's always the first photo in the carousel."}
      </p>

      {images.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.urn} className="relative">
              {image.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.previewUrl}
                  alt={image.altText}
                  className="aspect-square w-full rounded-[var(--radius-sm)] border border-line object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-line bg-surface-raised text-ink-subtle">
                  <ImagePlus aria-hidden className="size-5" />
                  <span className="font-mono text-xs">Photo {index + 2}</span>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={busy}
                onClick={() => remove(index)}
                aria-label={`Remove photo ${index + 2}`}
                className="absolute -right-2 -top-2 size-7 rounded-full bg-surface"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
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

        <Input
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          disabled={!hasCoverImage || busy || atMax}
          placeholder="Alt text (optional)"
          aria-label="Alt text for the next photo"
          className="max-w-48"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasCoverImage || busy || atMax}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          Add photo
        </Button>

        {atMax ? (
          <span className="text-sm text-ink-subtle">
            That&apos;s the most this gallery supports.
          </span>
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
