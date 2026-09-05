"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * A same-origin APK download link that shows a spinner while it's pending.
 *
 * This is a plain `<a>` navigation, not a fetch — the response's
 * `Content-Disposition: attachment` header makes the browser download it
 * without leaving the page, so there is no JS "download finished" event to
 * key off. The proxy route it points to has real work to do first (look up
 * the release on GitHub, then start streaming a ~50 MB file), and that gap
 * between click and the browser's own download UI appearing is exactly what
 * the spinner covers — it clears on a fixed timeout rather than waiting for
 * something this component can't observe.
 */
export function DownloadButton({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = React.useState(false);

  return (
    <ButtonLink
      href={href}
      variant={variant}
      size={size}
      aria-busy={pending}
      className={cn(pending && "pointer-events-none opacity-80", className)}
      onClick={() => {
        setPending(true);
        window.setTimeout(() => setPending(false), 4000);
      }}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Preparing…
        </>
      ) : (
        children
      )}
    </ButtonLink>
  );
}
