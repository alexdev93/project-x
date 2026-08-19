import { getBlogConfig } from "./config";
import { countLinks } from "./text";
import type { CommentStatus } from "./types";

/**
 * The rules about who may do what, and which comments are held back.
 *
 * Kept pure and in one file for two reasons. It is exhaustively testable without
 * a database or a request, and — more importantly — a reviewer can read every
 * authorization rule in the feature in one sitting instead of inferring them
 * from a dozen route handlers.
 *
 * This module decides; it does not enforce. Enforcement lives in two places, and
 * both are real: the SQL predicates in src/lib/db/comments.ts, which make an
 * unauthorised write match zero rows, and the `requireAdmin()` call at the top of
 * every admin route handler. The functions here exist so the UI can grey out a
 * button and the route can return the right status before doing work — never as
 * the only thing standing between a request and a row.
 */

/**
 * Whether a visitor may still edit their own comment.
 *
 * A window rather than forever: an editable comment that someone has already
 * replied to lets the author rewrite history under the reply. Fifteen minutes is
 * long enough to fix a typo and short enough that the thread above a reply is
 * settled.
 */
export function canEditComment(
  comment: { authorId: string; status: CommentStatus; createdAt: Date },
  viewerId: string | null,
  now: Date = new Date(),
): boolean {
  if (!viewerId || comment.authorId !== viewerId) return false;
  if (comment.status !== "visible") return false;

  const windowMs = getBlogConfig().commentEditWindowMinutes * 60_000;
  return now.getTime() - comment.createdAt.getTime() <= windowMs;
}

/**
 * Whether a visitor may delete their own comment.
 *
 * No time limit, unlike editing: withdrawing something you said is different
 * from silently changing it, and someone should always be able to take their
 * words down. The delete is soft — the row survives with an empty body — so
 * replies underneath it keep their anchor.
 *
 * An administrator's hard delete is deliberately not this function. It is a
 * separately named data-layer call reachable only from behind `requireAdmin()`,
 * so the two paths cannot be confused for one another.
 */
export function canDeleteComment(
  comment: { authorId: string; status: CommentStatus },
  viewerId: string | null,
): boolean {
  if (!viewerId || comment.authorId !== viewerId) return false;
  return comment.status === "visible";
}

/**
 * The status a new comment starts in.
 *
 * Under post-moderation a comment is visible immediately, which is what makes a
 * comment thread feel like a conversation. The link heuristic still holds the
 * obvious spam for approval — held, not rejected, because a legitimate
 * link-heavy reply should cost its author a delay rather than their words.
 */
export function initialCommentStatus(body: string): CommentStatus {
  const { moderation, linkFlagThreshold } = getBlogConfig();

  if (moderation === "pre") return "pending";
  if (linkFlagThreshold > 0 && countLinks(body) >= linkFlagThreshold) {
    return "pending";
  }
  return "visible";
}

/** Comment statuses a public reader may see at all. */
export function isPubliclyVisible(status: CommentStatus): boolean {
  // `deleted` is included on purpose: the tombstone keeps a reply's parent in
  // place, so a thread does not lose its shape when someone withdraws a comment.
  return status === "visible" || status === "deleted";
}
