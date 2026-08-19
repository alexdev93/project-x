"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * Decides whether a page wears the site's chrome.
 *
 * The admin panel has its own header and its own navigation, and stacking the
 * site's on top of it produced two headers and a floating "Ask AI" button over a
 * tool — three pieces of furniture for one page. Under /admin this renders the
 * page alone and lets AdminShell supply the frame.
 *
 * The header, footer and launcher arrive as **props, not imports**. That is what
 * keeps SiteFooter a server component: importing it here would drag it across
 * the client boundary and ship its markup as JavaScript for no reason. Only the
 * `usePathname` call needs to be on the client, so only this shell is.
 *
 * The precedent is already in the codebase — ChatLauncher hides itself on /ai,
 * for the same reason: one assistant per page.
 */
export function SiteChrome({
  header,
  footer,
  launcher,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  launcher: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    // `main#main` stays, so the skip link still has its target.
    return <main id="main">{children}</main>;
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="flex-1">
          {children}
        </main>
        {footer}
      </div>
      {launcher}
    </>
  );
}
