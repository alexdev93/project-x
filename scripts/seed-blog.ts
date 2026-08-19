/**
 * Seeds the two example posts.
 *
 *   yarn seed:blog            # insert or update the examples
 *   yarn seed:blog --dry-run  # print what it would write, touch nothing
 *
 * Idempotent: posts are keyed by slug, so re-running updates the examples in
 * place rather than accumulating copies. It only ever touches these two slugs —
 * anything written from the admin panel is left alone, so this is safe to run
 * against a database that already has real posts in it.
 *
 * These are examples in the sense that they are meant to be edited or deleted
 * from /admin once there is something real to say. They are written as posts
 * rather than as lorem ipsum because a feed full of placeholder text tells you
 * nothing about whether the feed works.
 */

// Must be first: populates process.env from .env.local.
import "./_env";

import { getSql } from "@/lib/db/client";
import { excerpt, readingMinutes } from "@/lib/blog/text";

const dryRun = process.argv.includes("--dry-run");

type Seed = {
  slug: string;
  title: string;
  tags: string[];
  body: string;
};

const SEEDS: Seed[] = [
  {
    slug: "counters-without-transactions",
    title: "Counting likes without a transaction",
    tags: ["postgres", "architecture"],
    body: `This site talks to Postgres over Neon's HTTP driver: one stateless
request per query, no session, and therefore no transactions. That is a
deliberate choice — serverless functions scale out, and a connection pool per
instance exhausts the database's slots long before traffic becomes interesting —
but it does rule out a whole family of ordinary-looking writes.

Take the like button. The obvious implementation is two statements: insert a row
into a reactions table, then bump a counter on the post. Without a transaction
around them, any failure between the two leaves a number that is permanently
wrong, and nothing will ever correct it.

## The rule that replaces the transaction

A write is safe without a transaction when its effect is a function of the
current state rather than of a value you read a moment ago. That rules out
\`SET like_count = like_count + 1\` and rules in three things:

- A composite primary key on \`(post_id, user_id)\`, so a like conflicts with
  itself. A double-click cannot count twice.
- \`ON CONFLICT DO UPDATE SET active = NOT active\` — one statement that serves
  both liking and unliking, taking a row lock on the conflict path so two
  concurrent taps serialise instead of racing.
- No stored counter at all. \`count(*)\` over the primary-key index is exact, and
  at this scale it costs microseconds. A number that is occasionally slow is
  better than a number that is quietly wrong.

## Where the authorization went

The same idea covers permissions. Instead of reading a post to check that it is
published and then inserting a comment, the insert resolves the post itself:

\`\`\`sql
INSERT INTO post_comments (post_id, user_id, body, depth, status)
SELECT p.id, $1, $2, 0, $3
FROM posts p
WHERE p.slug = $4 AND p.status = 'published' AND p.published_at <= now()
RETURNING id
\`\`\`

Commenting on a draft returns zero rows, which the route turns into a 404. The
authorization is the join. There is no version of this code where someone
forgets the check, because there is no separate check to forget.`,
  },
  {
    slug: "what-mobile-money-taught-me",
    title: "What mobile money taught me about failure",
    tags: ["backend", "reliability"],
    body: `Most backend work tolerates a retry. Mobile money does not. When a
transfer is the difference between someone eating tonight and not, "we'll
reconcile it in the morning" is not an engineering answer.

Working on the services behind M-PESA changed what I look for in a design. Three
things I now check before anything else.

## Every write needs an identity

Not a timestamp, not an auto-increment — an identifier the *client* generates and
reuses when it retries. Without it you cannot tell a duplicate request from a
second legitimate one, and at scale you will get both within the same second.
With it, the second attempt is a no-op and the caller gets the same answer as the
first.

## The interesting state is the one in between

A transfer is not "sent" or "received". It is pending, timed out, reversed,
reversed-but-the-reversal-failed. Systems that model only the happy states end up
discovering the others in production, usually via a support ticket written in
frustration.

## A slow answer beats a wrong one

The temptation under load is to answer optimistically and settle up later. For
money, the correct behaviour is to be honest that you do not know yet. Users
forgive a spinner. They do not forgive a balance that was right and then wasn't.

None of this is exotic. It is the ordinary discipline of treating each write as
something that might be interrupted halfway — which, given enough traffic, it
eventually is.`,
  },
];

async function main() {
  // Deferred so a dry run needs no database, matching `yarn ingest --dry-run`.
  const sql = dryRun ? null : getSql();

  console.log(`Seeding ${SEEDS.length} example posts`);

  for (const seed of SEEDS) {
    const teaser = excerpt(seed.body);
    const minutes = readingMinutes(seed.body);

    console.log(`\n  ${seed.slug}`);
    console.log(`    title    ${seed.title}`);
    console.log(`    tags     ${seed.tags.join(", ")}`);
    console.log(`    reading  ${minutes} min`);
    console.log(`    excerpt  ${teaser.slice(0, 96)}…`);

    if (!sql) continue;

    // Published on insert, because the point of a seeded example is to prove the
    // public feed renders. `COALESCE` on update keeps the original publication
    // date, so re-running does not shuffle the feed order.
    const rows = (await sql`
      INSERT INTO posts
        (slug, title, body, excerpt, tags, reading_minutes, status, published_at)
      VALUES (${seed.slug}, ${seed.title}, ${seed.body}, ${teaser},
              ${seed.tags}, ${minutes}, 'published', now())
      ON CONFLICT (slug) DO UPDATE SET
        title           = EXCLUDED.title,
        body            = EXCLUDED.body,
        excerpt         = EXCLUDED.excerpt,
        tags            = EXCLUDED.tags,
        reading_minutes = EXCLUDED.reading_minutes,
        status          = 'published',
        published_at    = COALESCE(posts.published_at, now()),
        updated_at      = now()
      RETURNING id, (created_at = updated_at) AS inserted
    `) as { id: string; inserted: boolean }[];

    console.log(`    ${rows[0]?.inserted ? "inserted" : "updated"}`);
  }

  if (!sql) {
    console.log("\nDry run — nothing written.");
    return;
  }

  const counts = (await sql`
    SELECT status, count(*)::int AS n FROM posts GROUP BY status ORDER BY status
  `) as { status: string; n: number }[];

  console.log(
    `\nposts now: ${counts.map((row) => `${row.n} ${row.status}`).join(", ")}`,
  );
}

main().catch((error) => {
  console.error(
    "\nSeed failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
