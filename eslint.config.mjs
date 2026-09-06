import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Flat config — `next lint` was removed in Next.js 16 in favor of running
 * ESLint directly (see package.json's `lint` script), which is what this
 * file replaces `.eslintrc.json` for.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react-hooks now ships the React Compiler's rule set,
      // which flags every "read an external, client-only source (localStorage,
      // matchMedia, the route) and setState after mount" effect as an error —
      // exactly the SSR-hydration pattern this app uses deliberately in
      // ThemeProvider, useChat, and elsewhere (each documents why in its own
      // comment). This project hasn't adopted the Compiler, so the rule's
      // premise doesn't apply; kept at warn rather than off so a genuinely
      // needless one is still visible.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // A standalone CommonJS one-off tool (see its own header comment),
    // never run through the app's module resolution — `next lint`'s default
    // scope never covered `scripts/`, so this never surfaced before `eslint .`
    // started linting the whole repo.
    files: ["scripts/build-brand-png.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
