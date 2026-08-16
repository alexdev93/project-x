"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ICON_PATHS, ICON_STROKE } from "./geometry";

/**
 * The mark assembling itself: the two strokes drift in from either side and
 * settle, then the bridge draws outward from the centre to join them.
 *
 * That order is the whole point — two separate things arrive first, and the
 * connection is what makes them a letter. It plays once on mount and then holds
 * still; a logo that keeps moving reads as a spinner, which is exactly what
 * this must not be.
 */

const EASE = [0.16, 1, 0.3, 1] as const; // easeOutExpo — quick start, soft stop

const [leftPath, rightPath, bridgePath] = ICON_PATHS;

export function AnimatedMark() {
  // null until the client resolves the media query, so treat it as "animate"
  // and let the values below collapse when it turns true.
  const reduced = useReducedMotion() ?? false;

  // One render path, always motion.path.
  //
  // Branching between motion.path and a plain path looked simpler but shipped a
  // bug: React reuses the <path> DOM node across the swap, so the inline
  // opacity:0 that framer-motion had already written was never cleared and the
  // mark stayed invisible under prefers-reduced-motion. Keeping a single
  // element type and varying only its values avoids the whole class of problem.
  const enter = (offset: number) =>
    reduced
      ? { opacity: 1, x: 0 }
      : { opacity: 0, x: offset };

  const settle = { opacity: 1, x: 0 };
  const duration = reduced ? 0 : 0.5;

  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    >
      <motion.path
        d={leftPath}
        initial={enter(-5)}
        animate={settle}
        transition={{ duration, ease: EASE }}
      />
      <motion.path
        d={rightPath}
        initial={enter(5)}
        animate={settle}
        transition={{ duration, ease: EASE }}
      />
      <motion.path
        d={bridgePath}
        // pathLength animates the bridge as a draw-on rather than a fade, so it
        // reads as a connection being made.
        initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.4, ease: EASE, delay: reduced ? 0 : 0.28 }}
      />
    </g>
  );
}
