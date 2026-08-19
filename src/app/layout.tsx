import React from "react";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/theme-script";
import { Header } from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SkipLink } from "@/components/layout/SkipLink";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { profile } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    // Page titles render as "Projects — Alemayehu Mekonen".
    template: `%s — ${profile.name}`,
  },
  description: profile.tagline,
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  openGraph: {
    type: "profile",
    siteName: profile.name,
    title: siteName,
    description: profile.tagline,
    url: siteUrl,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: profile.tagline,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: ThemeScript sets the class before React
    // hydrates, which is intended rather than a mismatch to fix.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <ThemeProvider>
          <SkipLink />
          {/* Passed as slots rather than imported by SiteChrome, so SiteFooter
              stays a server component. See that file's note. */}
          <SiteChrome
            header={<Header wordmark={profile.name} />}
            footer={<SiteFooter />}
            launcher={<ChatLauncher />}
          >
            {children}
          </SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
