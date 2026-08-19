import { z } from "zod";
import { getBlogConfig } from "./config";
import { SLUG_PATTERN } from "./text";

/**
 * What the API accepts.
 *
 * Note what is *not* in any of these schemas: no `userId`, no `authorName`, no
 * `authorEmail`. The author of a comment or a reaction is taken from the server
 * session and nowhere else, and because zod strips unknown keys by default,
 * sending one of those fields is a no-op rather than an attack. The same applies
 * to `status` on a comment — moderation state is decided by policy, never
 * submitted.
 *
 * Schemas are built lazily inside functions rather than as module constants,
 * because their bounds come from configuration and a module constant would
 * freeze whatever the environment looked like at import time.
 */

export function commentInputSchema() {
  const { commentMinLength, commentMaxLength } = getBlogConfig();

  return z.object({
    body: z
      .string()
      .trim()
      .min(commentMinLength, "Write a little more than that.")
      .max(commentMaxLength, `Keep it under ${commentMaxLength} characters.`),
    /**
     * Present for a reply, absent for a top-level comment. Which post the reply
     * belongs to is *not* accepted — it is inherited from the parent row inside
     * the insert, so a reply cannot be grafted onto a different post.
     */
    parentId: z.string().uuid().optional(),
  });
}

export function commentEditSchema() {
  const { commentMinLength, commentMaxLength } = getBlogConfig();

  return z.object({
    body: z
      .string()
      .trim()
      .min(commentMinLength, "Write a little more than that.")
      .max(commentMaxLength, `Keep it under ${commentMaxLength} characters.`),
  });
}

/**
 * Creating or editing a post, from the admin editor.
 *
 * `status` is absent here too: publishing is a separate endpoint, so a draft
 * cannot go live as a side effect of a save. That keeps "publish" a deliberate
 * act with its own audit point and its own cache invalidation.
 */
export function postInputSchema() {
  return z.object({
    title: z.string().trim().max(200, "Titles stay under 200 characters.").default(""),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "A slug is required.")
      .max(80, "Slugs stay under 80 characters.")
      .regex(SLUG_PATTERN, "Lower-case letters, numbers and single hyphens only."),
    body: z
      .string()
      .trim()
      .min(1, "A post needs something in it.")
      .max(100_000, "That is past the size a single post should be."),
    /**
     * Author-written when supplied, derived from the body when not. Left as a
     * stored column rather than always deriving it so the owner can write a
     * better teaser than a truncation.
     */
    excerpt: z.string().trim().max(400, "Excerpts stay under 400 characters.").default(""),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(8, "Eight tags is plenty.")
      .default([]),
  });
}

export type CommentInput = z.infer<ReturnType<typeof commentInputSchema>>;
export type CommentEditInput = z.infer<ReturnType<typeof commentEditSchema>>;
export type PostInput = z.infer<ReturnType<typeof postInputSchema>>;

/** Page number from a query string. Anything unparseable means page 1. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = z.coerce.number().int().min(1).max(10_000).catch(1).parse(raw);
  return parsed;
}
