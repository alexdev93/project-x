import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { TechTagList } from "@/components/ui/Badge";
import { PostBody } from "@/components/blog/PostBody";
import { LikeButton } from "@/components/blog/LikeButton";
import { CommentThread } from "@/components/blog/CommentThread";
import { getPost, getPublishedSlugs, getThread } from "@/lib/blog/service";
import { hasAuth } from "@/lib/auth/config";
import { formatDate, machineDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

/**
 * One post.
 *
 * Prerendered for every published slug, with `dynamicParams` left at its default
 * so a post published after the last build still renders on its first request
 * and is cached from then on. Publishing therefore does not need a redeploy.
 *
 * A draft resolves to null here — the data layer filters on published status, so
 * the 404 comes from the absence of a row rather than from a check that could be
 * forgotten. Nothing distinguishes "draft" from "never existed", which is the
 * intent.
 */

export const revalidate = 300;

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return {};

  const title = post.title || post.excerpt.slice(0, 60);

  return {
    title,
    description: post.excerpt,
    alternates: { canonical: absoluteUrl(`/blog/${post.slug}`) },
    openGraph: {
      type: "article",
      title,
      description: post.excerpt,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAt?.toISOString(),
      tags: post.tags,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  /**
   * The thread is read with no viewer, which is what keeps this page cacheable:
   * one rendering serves every reader. Which comments belong to the person
   * reading is decided in the browser — see CommentActions.
   */
  const comments = await getThread(post.id, null);

  return (
    <article className="py-14 sm:py-20">
      <Container>
        <Link
          href="/blog"
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          All writing
        </Link>

        <header className="mt-8 max-w-[68ch]">
          {post.title ? (
            <h1 className="font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
              {post.title}
            </h1>
          ) : (
            // A short thought has no headline. Rather than invent one, the date
            // becomes the heading — which keeps the document outline valid
            // without putting a fabricated title on the page.
            <h1 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
              {post.publishedAt ? formatDate(post.publishedAt) : "Draft"}
            </h1>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-subtle">
            {post.publishedAt && post.title ? (
              <time dateTime={machineDate(post.publishedAt)}>
                {formatDate(post.publishedAt)}
              </time>
            ) : null}
            <span>{post.readingMinutes} min read</span>
          </div>

          {post.tags.length > 0 ? (
            <TechTagList items={post.tags} className="mt-6" />
          ) : null}
        </header>

        <div className="mt-10">
          <PostBody>{post.body}</PostBody>
        </div>

        {/* The count comes from the cached page; whether *this* reader liked it
            is fetched by the button. See its note on why that split exists. */}
        <div className="mt-12 max-w-[68ch] border-t border-line pt-8">
          <LikeButton slug={post.slug} initialCount={post.likeCount} />
        </div>

        <CommentThread
          slug={post.slug}
          comments={comments}
          canComment={hasAuth()}
        />
      </Container>
    </article>
  );
}
