import React from "react";
import { cn } from "@/lib/utils";
import {
  ICON_INK_RATIO,
  ICON_PATHS,
  ICON_STROKE,
  ICON_VIEW_BOX,
  WORDMARK_CAP,
  WORDMARK_PATH,
  WORDMARK_WIDTH,
} from "./geometry";
import { AnimatedMark } from "./AnimatedMark";

/**
 * The Alex identity.
 *
 * The mark is two strokes that never touch, bridged by the crossbar — remove
 * the bridge and it falls apart into two halves. Everything is drawn in
 * `currentColor`, so the logo takes the colour of whatever it sits in rather
 * than carrying its own. That is what lets one component serve the light theme,
 * the dark theme and any future project without a variant per context.
 *
 * Static by default; `animated` opts into the mount animation, which is itself
 * reduced-motion aware.
 */

export type AlexLogoVariant = "lockup" | "icon" | "wordmark";

type AlexLogoProps = {
  variant?: AlexLogoVariant;
  /** Plays a one-shot convergence on mount. Ignored for the wordmark. */
  animated?: boolean;
  /**
   * Accessible name. Omit when the logo sits inside an already-labelled
   * element (a link that says "Alex"), so it is not announced twice.
   */
  label?: string;
  className?: string;
};

/** Gap between mark and wordmark, in wordmark cap units. */
const LOCKUP_GAP = 0.42;

function IconPaths() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    >
      {ICON_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

export function AlexLogo({
  variant = "lockup",
  animated = false,
  label,
  className,
}: AlexLogoProps) {
  // A decorative logo must be hidden from assistive tech, or every nav link
  // reads its name twice.
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const, focusable: "false" as const };

  if (variant === "icon") {
    return (
      <svg
        viewBox={ICON_VIEW_BOX}
        className={cn("h-6 w-6", className)}
        {...a11y}
      >
        {animated ? <AnimatedMark /> : <IconPaths />}
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <svg
        viewBox={`0 -${WORDMARK_CAP} ${WORDMARK_WIDTH} ${WORDMARK_CAP}`}
        className={cn("h-5 w-auto", className)}
        {...a11y}
      >
        <path fill="currentColor" d={WORDMARK_PATH} />
      </svg>
    );
  }

  // Scaling the mark's box by 1/ICON_INK_RATIO makes its ink exactly as tall as
  // the wordmark's cap height, so the two align without hand-tuning.
  const box = WORDMARK_CAP / ICON_INK_RATIO;
  const gap = WORDMARK_CAP * LOCKUP_GAP;
  const width = box + gap + WORDMARK_WIDTH;

  return (
    <svg
      viewBox={`0 -${WORDMARK_CAP} ${width} ${WORDMARK_CAP}`}
      className={cn("h-6 w-auto", className)}
      {...a11y}
    >
      <g transform={`translate(0 -${WORDMARK_CAP}) scale(${box / 64})`}>
        {animated ? <AnimatedMark /> : <IconPaths />}
      </g>
      <path
        fill="currentColor"
        transform={`translate(${box + gap} 0)`}
        d={WORDMARK_PATH}
      />
    </svg>
  );
}
