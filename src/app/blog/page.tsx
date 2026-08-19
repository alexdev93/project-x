import React from "react";
import type { Metadata } from "next";
import { FeedView } from "@/components/blog/FeedView";
import { getFeed } from "@/lib/blog/service";

/**
 * The feed's front door.
 *
 * Statically rendered with ISR. The window is a backstop rather than the
 * mechanism — publishing invalidates this path directly, so a new post appears
 * at once; the window matters for a change made outside the app, such as a row
 * edited by hand.
 *
 * Pages beyond the first live at /blog/page/[page] rather than behind a query
 * string, because reading `searchParams` here would opt this route out of the
 * static output entirely.
 *
 * With no database configured this renders an empty state rather than a 404,
 * which is what lets the "Writing" nav item be unconditional — see the note in
 * src/lib/site.ts.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Notes on backend systems, reliability and the occasional thing worth writing down.",
};

export default async function BlogPage() {
  return <FeedView feed={await getFeed(1)} />;
}
