import React from "react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Pagination } from "@/components/ui/Pagination";
import { PostCard } from "@/components/blog/PostCard";
import { getBlogConfig } from "@/lib/blog/config";
import type { Page, PostSummary } from "@/lib/blog/types";

/**
 * The feed, shared by /blog and /blog/page/[n].
 *
 * Pagination is a route segment rather than a query string, and that is a
 * rendering decision rather than a taste one: reading `searchParams` in Next 14
 * opts the whole route out of static rendering, so a `?page=` feed would have
 * made the blog's front door server-rendered on every request. As segments,
 * every page of the archive is prerendered.
 */
export function FeedView({ feed }: { feed: Page<PostSummary> }) {
  const { pageSize } = getBlogConfig();

  return (
    <Section width="wide" size="lg">
      <SectionHeader
        as="h1"
        eyebrow="Writing"
        title="Notes"
        description="Thoughts on the systems I build — what broke, what held, and what I would do differently."
      />

      {feed.items.length === 0 ? (
        <p className="mt-14 rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center text-ink-muted">
          Nothing published yet. Check back soon.
        </p>
      ) : (
        <>
          <Stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feed.items.map((post) => (
              <StaggerItem key={post.id} className="h-full">
                {/* h2: the section header above is the h1. */}
                <PostCard post={post} headingLevel={2} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>

          <Pagination
            page={feed.page}
            pageCount={feed.pageCount}
            hrefFor={(n) => (n === 1 ? "/blog" : `/blog/page/${n}`)}
            className="mt-14"
            label="Posts"
          />
        </>
      )}

      {/* Announced to assistive tech, invisible otherwise: which slice of the
          archive is on screen is not obvious from a grid alone. */}
      <p className="sr-only">
        {feed.total === 0
          ? "No posts."
          : `Showing page ${feed.page} of ${feed.pageCount}, ${pageSize} posts per page, ${feed.total} in total.`}
      </p>
    </Section>
  );
}
