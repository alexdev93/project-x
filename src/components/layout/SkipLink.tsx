import React from "react";

/**
 * Lets keyboard and screen-reader users jump past the header straight to the
 * content. Visually hidden until focused.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius)] focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:text-ink focus:shadow-[var(--shadow-overlay)]"
    >
      Skip to content
    </a>
  );
}
