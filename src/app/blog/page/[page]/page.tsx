import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FeedView } from "@/components/blog/FeedView";
import { getFeed } from "@/lib/blog/service";

/**
 * Page two onwards of the archive.
 *
 * A route segment rather than a query string, so these are prerendered like
 * everything else — see the note in FeedView. `generateStaticParams` builds the
 * pages that exist at build time, and `dynamicParams` stays on so a page that
 * appears later still renders on its first request.
 *
 * Page one redirects to /blog rather than rendering the same list at a second
 * URL, which would be duplicate content for a crawler and two places to link to
 * for a reader.
 */

export const revalidate = 300;

type Params = { params: { page: string } };

export async function generateStaticParams() {
  const feed = await getFeed(1);
  // Page one is /blog, so this starts at two.
  return Array.from({ length: Math.max(0, feed.pageCount - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

export function generateMetadata({ params }: Params): Metadata {
  return {
    title: `Writing — page ${params.page}`,
    // Deliberately not indexed: the posts themselves are what a search engine
    // should surface, and a paginated slice of excerpts competes with them.
    robots: { index: false, follow: true },
  };
}

export default async function BlogPagePage({ params }: Params) {
  const page = Number(params.page);

  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) redirect("/blog");

  const feed = await getFeed(page);

  // Past the end of the archive. A 404 rather than an empty grid, so a stale
  // link is honest about being stale.
  if (feed.items.length === 0) notFound();

  return <FeedView feed={feed} />;
}
