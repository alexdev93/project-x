import React from "react";
import { GeminiConstellation } from "@/components/brand/GeminiConstellation";
import { cn } from "@/lib/utils";

/**
 * The portrait panel.
 *
 * The image comes from the `--hero-portrait` custom property rather than an
 * `<img>`, which is what keeps the two theme renderings to a single download —
 * see the token's own note in globals.css. Because it is then a background
 * rather than an element, the panel carries `role="img"` and a label so it is
 * still announced.
 *
 * `ambient` adds the motion around the portrait: a drifting wash of accent
 * light and a twinkling Gemini constellation, both sitting *behind and beside*
 * the panel rather than moving the portrait itself. The distinction is
 * deliberate — a face that drifts or tilts draws attention to the animation,
 * where light moving around a still face reads as atmosphere.
 *
 * All of that motion is CSS, so this stays a server component with no
 * JavaScript, and the global prefers-reduced-motion rule collapses it.
 */

export function PortraitFrame({
  label,
  ambient = false,
  className,
}: {
  label: string;
  ambient?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {ambient ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 -z-10 overflow-visible"
          >
            <div className="animate-aura absolute inset-0 rounded-full bg-accent-soft blur-3xl" />
          </div>

          {/* Offset outside the panel's top-right corner so the constellation
              frames the portrait instead of sitting on top of his face. */}
          <GeminiConstellation
            animated
            className="pointer-events-none absolute -right-7 -top-9 z-10 w-24 text-accent/60 sm:w-28"
          />
        </>
      ) : null}

      <div
        role="img"
        aria-label={label}
        style={{ backgroundImage: "var(--hero-portrait)" }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface-raised bg-cover bg-center"
      />
    </div>
  );
}
