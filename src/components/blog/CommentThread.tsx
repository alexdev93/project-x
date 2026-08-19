import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { CommentActions } from "./CommentActions";
import { CommentForm } from "./CommentForm";
import { machineDate, relativeTime } from "@/lib/format";
import type { CommentNode, Comment } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/**
 * A post's comments, server-rendered.
 *
 * ## Comment bodies are plain text. Always.
 *
 * They are rendered as a string inside JSX, which React escapes, with
 * `whitespace-pre-wrap` preserving the line breaks someone typed. **They must
 * never be passed through a markdown renderer.** "Let readers use markdown too"
 * is the well-intentioned change that would turn every commenter into someone
 * who can inject markup, and it is the single most likely way this feature grows
 * a cross-site scripting hole. If richer comments are ever genuinely wanted, the
 * work is a sanitising renderer with an allowlist — not switching this line.
 *
 * ## Why it is server-rendered
 *
 * The thread is in the HTML, so it is indexable, readable without JavaScript,
 * and costs nothing to display. Only the composer and the owner-actions are
 * client components. A new comment appears because the write path revalidates
 * this post's path, not because anything polls.
 *
 * Exactly two levels, which is enforced three times over — in the schema's CHECK
 * constraints, in the insert's predicate, and here, by only ever reading
 * `node.replies`.
 */

export function CommentThread({
  slug,
  comments,
  canComment,
}: {
  slug: string;
  comments: CommentNode[];
  /** False when sign-in is not configured at all. */
  canComment: boolean;
}) {
  const total = comments.reduce((n, node) => n + 1 + node.replies.length, 0);

  return (
    <section className="mt-14 max-w-[68ch] border-t border-line pt-10">
      <h2 className="font-display text-2xl text-ink">
        {total === 0 ? "Comments" : `${total} comment${total === 1 ? "" : "s"}`}
      </h2>

      <div className="mt-6">
        <CommentForm slug={slug} canComment={canComment} />
      </div>

      {comments.length === 0 ? (
        <p className="mt-10 text-sm text-ink-subtle">
          Nothing here yet. Say the first thing.
        </p>
      ) : (
        <ol className="mt-10 flex flex-col gap-8">
          {comments.map((node) => (
            <li key={node.id}>
              <CommentBody comment={node} />

              {node.replies.length > 0 ? (
                <ol className="mt-6 flex flex-col gap-6 border-l border-line pl-5 sm:pl-6">
                  {node.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentBody comment={reply} />
                    </li>
                  ))}
                </ol>
              ) : null}

              {/* Replies are one level deep, so only a top-level comment offers
                  one — which is also why the reply form lives here and not
                  inside CommentBody. */}
              {canComment && node.status === "visible" ? (
                <div className="mt-4 pl-5 sm:pl-6">
                  <CommentForm
                    slug={slug}
                    parentId={node.id}
                    canComment={canComment}
                    compact
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentBody({ comment }: { comment: Comment }) {
  const withdrawn = comment.status === "deleted";

  return (
    <article className="flex gap-3">
      <Avatar name={comment.authorName} src={comment.authorImage} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-ink">{comment.authorName}</p>
          <time
            dateTime={machineDate(comment.createdAt)}
            className="text-xs text-ink-subtle"
          >
            {relativeTime(comment.createdAt)}
          </time>
          {comment.editedAt && !withdrawn ? (
            <span className="text-xs text-ink-subtle">· edited</span>
          ) : null}

        </div>

        <p
          className={cn(
            "mt-1.5 text-[0.9375rem] leading-relaxed",
            withdrawn ? "italic text-ink-subtle" : "whitespace-pre-wrap text-ink-muted",
          )}
        >
          {withdrawn ? "This comment was withdrawn." : comment.body}
        </p>

        {/* The client decides whether these belong to the reader, because the
            page must not read the session on the server — doing so would opt
            this route out of static rendering to decide who owns a comment. */}
        {withdrawn ? null : (
          <CommentActions
            authorId={comment.authorId}
            comment={{
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt.toISOString(),
            }}
          />
        )}
      </div>
    </article>
  );
}
