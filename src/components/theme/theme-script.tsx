import React from "react";

export const THEME_STORAGE_KEY = "portfolio-theme";

/**
 * Runs before first paint to apply the resolved theme, which is the only way
 * to avoid a light-to-dark flash on load. Kept as a hand-minified string
 * because it must be inline — an external script would arrive too late.
 */
const script = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      // The content is a build-time constant with no interpolated user input.
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
