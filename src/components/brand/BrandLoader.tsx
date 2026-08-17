import React from "react";
import { AlexLogo } from "@/components/brand/AlexLogo";
import { GeminiConstellation } from "@/components/brand/GeminiConstellation";
import { profile } from "@/content";
import { cn } from "@/lib/utils";

/**
 * The loading state, built from the identity rather than a generic spinner.
 *
 * The Gemini constellation twinkles on a stagger inside a drifting wash of
 * accent light, with the brand mark and name beneath it. No hooks and no
 * JavaScript — the motion is CSS, so this renders identically as a route
 * fallback on the server and as a lazy-import fallback inside a client
 * component, and the global prefers-reduced-motion rule stills it.
 *
 * Deliberately not a timed splash screen. An artificial delay in front of the
 * content is exactly the defect this project started out with — a hardcoded
 * three-second loader that destroyed the largest-contentful-paint — so this
 * only ever appears while something is genuinely pending.
 */

export function BrandLoader({
  compact = false,
  message = "Loading",
}: {
  /** Fills a panel rather than a viewport; drops the name and mark. */
  compact?: boolean;
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-7 text-center",
        compact ? "min-h-0 flex-1 py-12" : "min-h-[70vh] px-6 py-24",
      )}
    >
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute -inset-14 -z-10">
          <div className="animate-aura absolute inset-0 rounded-full bg-accent-soft blur-3xl" />
        </div>
        <GeminiConstellation
          animated
          className={cn("text-accent", compact ? "w-20" : "w-28")}
        />
      </div>

      {compact ? null : (
        <div className="flex flex-col items-center gap-3">
          <AlexLogo variant="icon" className="size-6 text-ink" />
          <p className="font-display text-xl text-ink">{profile.name}</p>
        </div>
      )}

      <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-subtle">
        {message}
      </p>
    </div>
  );
}
