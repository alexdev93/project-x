"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PORTRAIT_PATHS, PORTRAIT_VIEW_BOX } from "./lineart-geometry";

/**
 * An animated line-art portrait, traced from the real photograph rather than
 * drawn freehand or synthesised — see scripts/build-portrait-lineart.py for
 * how the strokes were extracted.
 *
 * Pure `currentColor` ink and no raster underneath, so it is correct in both
 * themes for free: the one thing a photographic cutout could not be without a
 * second matting pass per theme.
 *
 * The silhouette draws first, then facial detail resolves inside it — roughly
 * the order a hand-drawn portrait follows. Plays once on mount and holds
 * still afterward, the same contract as the brand mark's own animation: this
 * is a portrait assembling itself, not a spinner.
 */

const EASE = [0.16, 1, 0.3, 1] as const; // easeOutExpo

const [SILHOUETTE, ...DETAIL] = PORTRAIT_PATHS;

// Detail paths are already ordered longest-first by the generator, so the
// stagger draws the features that carry the likeness (brows, eyes, nose)
// before the shorter texture strokes.
const STAGGER_STEP = 0.011;
const DETAIL_START = 0.32;
const SILHOUETTE_DURATION = 0.8;
const DETAIL_DURATION = 0.35;

export function PortraitLineArt({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  const reduced = useReducedMotion() ?? false;

  const drawn = { pathLength: 1, opacity: 1 };
  const undrawn = reduced ? drawn : { pathLength: 0, opacity: 0 };

  return (
    <svg
      viewBox={PORTRAIT_VIEW_BOX}
      className={className}
      role="img"
      aria-label={label}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d={SILHOUETTE}
          strokeWidth={1.6}
          initial={undrawn}
          animate={drawn}
          transition={{ duration: reduced ? 0 : SILHOUETTE_DURATION, ease: EASE }}
        />
        {DETAIL.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            strokeWidth={1.3}
            initial={undrawn}
            animate={drawn}
            transition={{
              duration: reduced ? 0 : DETAIL_DURATION,
              ease: EASE,
              delay: reduced ? 0 : DETAIL_START + i * STAGGER_STEP,
            }}
          />
        ))}
      </g>
    </svg>
  );
}
