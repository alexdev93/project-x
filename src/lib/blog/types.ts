/**
 * Domain types for the blog.
 *
 * These are the shapes the application works in: camelCase, real `Date`s, and no
 * database columns leaking through. The `Row` types that mirror the tables are
 * private to src/lib/db/*, and the mappers there are the only place the two
 * vocabularies meet.
 *
 * Note what is deliberately absent from the public shapes: no author email, and
 * no internal identifier beyond the opaque ones the client genuinely needs. A
 * comment carries its author's name and picture because they are rendered; the
 * address they signed up with is not the reader's business.
 */

export type PostStatus = "draft" | "published";

export const POST_STATUSES: readonly PostStatus[] = ["draft", "published"];

export type CommentStatus = "visible" | "pending" | "hidden" | "deleted";

export const COMMENT_STATUSES: readonly CommentStatus[] = [
  "visible",
  "pending",
  "hidden",
  "deleted",
];

/** A feed item: everything the card needs, and no body. */
export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  pinned: boolean;
  readingMinutes: number;
  publishedAt: Date | null;
  likeCount: number;
  commentCount: number;
};

/** A post page: the summary plus the body. */
export type Post = PostSummary & {
  body: string;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
};

/** One comment, with its author snapshot joined in. */
export type Comment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  editedAt: Date | null;
};

/** A top-level comment with its replies. Exactly two levels, always. */
export type CommentNode = Comment & { replies: Comment[] };

/** A page of results, with the total so the caller can render page numbers. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
};

/** A comment awaiting or under moderation, with the post it belongs to. */
export type ModerationItem = Comment & {
  postSlug: string;
  postTitle: string;
};

/** A signed-in visitor, as the admin user list shows them. */
export type BlogUser = {
  id: string;
  name: string;
  /** Admin-only projection. Never included in a public response. */
  email: string;
  image: string | null;
  createdAt: Date;
  blocked: boolean;
  commentCount: number;
};
