import React from "react";
import { cn } from "@/lib/utils";

/**
 * A commenter's picture, with a letter fallback.
 *
 * The fallback is not decoration — Google accounts can and do come back with a
 * null `image`, and a broken image icon next to someone's comment looks like
 * the site is failing rather than like a person without a photo.
 *
 * A plain `<img>` rather than `next/image` on purpose: these URLs point at
 * Google's own CDN, and routing them through the optimiser would need
 * `remotePatterns` for a host we do not control, cost a serverless invocation
 * per avatar, and gain nothing on a 32px square that is already served
 * optimised at exactly that size.
 */

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
} as const;

export function Avatar({
  name,
  src,
  size = "sm",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const base = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    "border border-line bg-surface-raised font-medium text-ink-muted",
    sizes[size],
    className,
  );

  // Decorative: the comment already carries the author's name as text, so
  // announcing it again here would just repeat it.
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        width={40}
        height={40}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn(base, "object-cover")}
      />
    );
  }

  return (
    <span aria-hidden className={base}>
      {initial(name)}
    </span>
  );
}

function initial(name: string): string {
  // `codePointAt` rather than `[0]`, so an emoji or a non-BMP script does not
  // get sliced in half into a replacement character.
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  const code = trimmed.codePointAt(0);
  return code === undefined
    ? "?"
    : String.fromCodePoint(code).toLocaleUpperCase();
}
