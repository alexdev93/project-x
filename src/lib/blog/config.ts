import { z } from "zod";

/**
 * Blog configuration, validated once, with a working default for everything.
 *
 * Same shape as src/lib/ai/config.ts: `.catch()` on every field, so an
 * unparseable or absent variable falls back rather than crashing a build. There
 * is no required variable here at all — an unconfigured deployment gets a blog
 * that reads and an empty state where the posts would be.
 */

const numeric = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).catch(fallback);

const schema = z.object({
  /** Posts per page in the feed. */
  pageSize: numeric(10, 1, 50),

  /** Recent posts shown on the home page. */
  homeCount: numeric(3, 1, 10),

  /**
   * ISR window for the feed and post pages, in seconds. Publishing does not
   * wait for it — an admin mutation revalidates the affected paths and tags
   * immediately — so this is only the backstop for a change made outside the
   * app, such as a row edited by hand.
   */
  revalidateSeconds: numeric(300, 30, 86_400),

  /** Upper bound on a comment, in characters. */
  commentMaxLength: numeric(2000, 50, 10_000),
  /** Lower bound. Two characters is enough for "ok" and stops empty submissions. */
  commentMinLength: numeric(2, 1, 100),

  /** Comments allowed per window, per signed-in user. */
  commentRateLimit: numeric(5, 1, 100),
  /** That window, in seconds. */
  commentRateWindowSeconds: numeric(300, 10, 86_400),

  /** How long a visitor may edit their own comment, in minutes. */
  commentEditWindowMinutes: numeric(15, 0, 1440),

  /**
   * `post` publishes a comment immediately and lets the owner hide it
   * afterwards; `pre` holds every comment for approval. Post-moderation is the
   * default because a conversation that only appears hours later is not a
   * conversation — and the link heuristic below still catches the obvious spam.
   */
  moderation: z.enum(["pre", "post"]).catch("post"),

  /**
   * A comment with at least this many URLs is held for approval rather than
   * rejected. Rejecting would lose a legitimate link-heavy reply; holding costs
   * it a delay. Set to 0 to disable.
   */
  linkFlagThreshold: numeric(3, 0, 20),
});

export type BlogConfig = z.infer<typeof schema>;

let cached: BlogConfig | null = null;

export function getBlogConfig(): BlogConfig {
  cached ??= schema.parse({
    pageSize: process.env.BLOG_PAGE_SIZE,
    homeCount: process.env.BLOG_HOME_COUNT,
    revalidateSeconds: process.env.BLOG_REVALIDATE_SECONDS,
    commentMaxLength: process.env.BLOG_COMMENT_MAX_LENGTH,
    commentMinLength: process.env.BLOG_COMMENT_MIN_LENGTH,
    commentRateLimit: process.env.BLOG_COMMENT_RATE_LIMIT,
    commentRateWindowSeconds: process.env.BLOG_COMMENT_RATE_WINDOW,
    commentEditWindowMinutes: process.env.BLOG_COMMENT_EDIT_WINDOW_MINUTES,
    moderation: process.env.BLOG_COMMENT_MODERATION,
    linkFlagThreshold: process.env.BLOG_LINK_FLAG_THRESHOLD,
  });
  return cached;
}

/**
 * Whether the blog has anywhere to store posts.
 *
 * False turns `/blog` into an empty state rather than a 404, which is what keeps
 * the navigation item unconditional — see the note in src/lib/site.ts.
 */
export function hasBlog(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
