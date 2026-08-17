import React from "react";
import { cn } from "@/lib/utils";

/**
 * The Gemini constellation, stylised.
 *
 * Two figures side by side, joined across the middle. The reason it earns a
 * place here is that it is the same idea the brand mark already encodes — two
 * separate strokes that only become a letter once bridged — so the zodiac
 * reference lands as a restatement of the identity rather than as decoration
 * bolted on.
 *
 * Drawn as a star chart, not as the ♊ glyph. The glyph is a horoscope
 * signifier and was ruled out when the brand was designed; a constellation of
 * real named stars reads as astronomy, which sits far more comfortably next to
 * an engineering portfolio.
 *
 * Positions are a simplified Gemini: Castor and Pollux as the two bright heads,
 * with the fainter stars descending from each. Star radii track magnitude, so
 * Pollux — the brightest in the real constellation — is the largest here.
 */

type Star = { x: number; y: number; r: number; name: string };

const STARS: Star[] = [
  { x: 38, y: 15, r: 2.6, name: "Castor" },
  { x: 31, y: 44, r: 1.8, name: "Mebsuta" },
  { x: 27, y: 76, r: 1.7, name: "Tejat" },
  { x: 21, y: 116, r: 2.0, name: "Alhena" },
  { x: 86, y: 23, r: 3.2, name: "Pollux" },
  { x: 92, y: 52, r: 1.9, name: "Wasat" },
  { x: 95, y: 84, r: 1.7, name: "Alzirr" },
  { x: 101, y: 122, r: 1.9, name: "Nucatai" },
];

/** Index pairs: each twin's own spine, then the two bonds between them. */
const LINES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
  [6, 7],
  [1, 5],
  [2, 6],
];

export function GeminiConstellation({
  className,
  animated = false,
  label,
}: {
  className?: string;
  /** Twinkles the stars on a stagger. Collapsed by prefers-reduced-motion. */
  animated?: boolean;
  /** Omit for decoration, so it is not announced. */
  label?: string;
}) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <svg viewBox="0 0 122 137" className={cn("w-32", className)} {...a11y}>
      <g stroke="currentColor" strokeWidth={0.6} opacity={0.45}>
        {LINES.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={STARS[from].x}
            y1={STARS[from].y}
            x2={STARS[to].x}
            y2={STARS[to].y}
          />
        ))}
      </g>
      <g fill="currentColor">
        {STARS.map((star, i) => (
          <circle
            key={star.name}
            cx={star.x}
            cy={star.y}
            r={star.r}
            className={animated ? "animate-twinkle" : undefined}
            // Prime-ish offsets so the stars never pulse in unison, which would
            // read as one blinking object rather than a sky.
            style={animated ? { animationDelay: `${(i * 0.7) % 5}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
