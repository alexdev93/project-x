import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

/**
 * Self-hosted by next/font at build time: no network request at runtime, and
 * `display: swap` plus a matching fallback keeps CLS at zero.
 */

/** Display face — reserved for hero and section titles, never body copy. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

/** UI and body face. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Technical face — tags, metrics, code. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const fontVariables = [
  instrumentSerif.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(" ");
