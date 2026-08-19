import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { PostCard } from "@/components/blog/PostCard";
import { getRecent } from "@/lib/blog/service";

/**
 * The most recent posts, on the home page.
 *
 * Returns null when there is nothing to show — no database, a failed read, or
 * simply no published posts yet. The home page therefore looks exactly as it did
 * before this feature existed until there is something worth linking to, which
 * is the same posture `SelectedWork` takes with an empty project list.
 *
 * An async server component. Making the home page `async` to await it does
 * **not** make the page dynamic: it stays in the static output, which was
 * checked in the build's route table rather than assumed.
 */
export async function RecentWriting() {
  const posts = await getRecent();
  if (posts.length === 0) return null;

  return (
    <Section width="wide" size="lg">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          eyebrow="Writing"
          title="Recent notes"
          description="Short pieces on what I am building and what it taught me."
        />

        <Link
          href="/blog"
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          All writing
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <Stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <StaggerItem key={post.id} className="h-full">
            {/* h3: the section header above is an h2. */}
            <PostCard post={post} headingLevel={3} className="h-full" />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
