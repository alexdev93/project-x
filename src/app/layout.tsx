import React from "react";
import type { Metadata, Viewport } from "next";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/theme-script";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alemayehu Mekonen | Full-Stack & DevOps Engineer",
  description:
    "Portfolio of Alemayehu (Alex) Mekonen — a full-stack and DevOps engineer specialising in Spring Boot, Node.js, Docker and Kubernetes.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
};

const RootLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // suppressHydrationWarning: ThemeScript mutates the class list before
    // React hydrates, which is the point — it is not a mismatch to fix.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        {/* Emotion SSR cache for the App Router — removes the style flash.
            Both this and CssBaseline go away once the last MUI section does. */}
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <CssBaseline />
          <ThemeProvider>{children}</ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
};

export default RootLayout;
