import React from "react";
import Link from "next/link";
import { Heart, MessageCircle, Pin } from "lucide-react";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { machineDate, relativeTime } from "@/lib/format";
import type { PostSummary } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/**
 * One post in the feed.
 *
 * Reuses ProjectCard's stretched-link pattern — the whole card is the hit area,
 * but only the title is announced as the link — so the two indexes behave the
 * same way under a screen reader and a mouse.
 *
 * The counts are decoration here, not controls: a like needs a session and a
 * round trip, and putting a real button in a feed card would mean shipping the
 * client component for every row. The button lives on the post's own page; these
 * are just the numbers. That keeps this a server component with no JavaScript.
 *
 * A title-less post — the short-thought case — leads with its body instead, the
 * way a timeline entry does. Because the excerpt then *is* the post, the card
 * shows more of it.
 */
export function PostCard({
  post,
  headingLevel = 2,
  className,
}: {
  post: PostSummary;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const untitled = post.title.trim().length === 0;

  return (
    <Card interactive className={cn("group relative flex flex-col", className)}>
      <div className="flex flex-1 flex-col p-6">
        {post.pinned ? (
          <Badge tone="accent" className="mb-4 self-start">
            <Pin aria-hidden />
            Pinned
          </Badge>
        ) : null}

        <Heading
          className={cn(
            "font-display leading-tight text-ink",
            untitled
              ? "line-clamp-5 min-h-28 text-lg font-normal"
              : "line-clamp-2 min-h-15 text-2xl",
          )}
        >
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0"
          >
            {untitled ? post.excerpt : post.title}
          </Link>
        </Heading>

        {untitled ? null : (
          // No `flex-1` here — combined with `line-clamp`'s
          // `display: -webkit-box` it stops Chrome from actually clipping
          // the text (see ProjectCard). `min-h` reserves the same space.
          <p className="mt-3 line-clamp-3 min-h-17 text-sm leading-relaxed text-ink-muted">
            {post.excerpt}
          </p>
        )}

        {post.tags.length > 0 ? (
          <TechTagList
            items={post.tags.slice(0, 5)}
            className="mt-5 h-14 overflow-hidden"
          />
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-subtle">
          {post.publishedAt ? (
            <time dateTime={machineDate(post.publishedAt)}>
              {relativeTime(post.publishedAt)}
            </time>
          ) : null}

          <span>{post.readingMinutes} min read</span>

          {post.likeCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <Heart aria-hidden className="size-3.5" />
              {post.likeCount}
              <span className="sr-only">
                {post.likeCount === 1 ? "like" : "likes"}
              </span>
            </span>
          ) : null}

          {post.commentCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <MessageCircle aria-hidden className="size-3.5" />
              {post.commentCount}
              <span className="sr-only">
                {post.commentCount === 1 ? "comment" : "comments"}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
