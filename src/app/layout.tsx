import React from "react";
import type { Metadata, Viewport } from "next";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";

export const metadata: Metadata = {
  title: "Alemayehu Mekonen | Full-Stack & DevOps Engineer",
  description:
    "Portfolio of Alemayehu (Alex) Mekonen — a full-stack and DevOps engineer specialising in Spring Boot, Node.js, Docker and Kubernetes.",
};

export const viewport: Viewport = {
  themeColor: "#191d2b",
};

const RootLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#191d2b" }}>
        {/* Gives Emotion an SSR-safe cache under the App Router, which
            removes the unstyled-content flash on first paint. */}
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <CssBaseline />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
};

export default RootLayout;
