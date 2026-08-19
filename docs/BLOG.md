# Blog and Admin — Architecture

An X-style feed for short posts and long ones, with Google sign-in, likes,
comments and moderation — and an admin panel that also edits the portfolio's own
content.

---

## 1. The constraint that shapes everything

The database is reached through Neon's **HTTP driver**, chosen so that
short-lived serverless functions cannot exhaust Postgres connection slots. One
stateless request per query, and therefore:

```
No sessions.  No transactions.  No BEGIN/COMMIT anywhere in src/lib/db.
```

That rules out a whole family of ordinary-looking writes. Insert a reaction row,
then bump a counter on the post: without a transaction around the pair, any
failure between them leaves a number that is permanently wrong and nothing will
ever correct it.

So every write in this feature obeys one rule:

> **A write is safe when its effect is a function of current state, never of a
> value read a moment earlier.**

Four applications of it, which between them cover every mutation here:

| Instead of | This |
|---|---|
| read, decide, write | `INSERT … ON CONFLICT DO UPDATE` |
| a counter delta | `count(*)` at read time |
| check-then-act authorization | the check as a `WHERE` clause on the acting statement |
| multi-table cleanup | `ON DELETE CASCADE` |

There is exactly one exception in the codebase, and it is confined to one file:
Better Auth reaches Postgres through Kysely, whose dialect calls
`pool.connect()`, which Neon's `poolQueryViaFetch` shortcut does not cover. It
gets its own WebSocket-backed pool capped at a single connection, touched only by
`/api/auth/*`. See the docblock in `src/lib/auth/server.ts`.

---

## 2. Authorization is the join

The most load-bearing idea in the feature. Rather than reading a post to check it
is published and then inserting a comment, the insert resolves the post itself:

```sql
INSERT INTO post_comments (post_id, user_id, body, depth, status)
SELECT p.id, $1, $2, 0, $3
FROM posts p
WHERE p.slug = $4 AND p.status = 'published' AND p.published_at <= now()
RETURNING id, created_at, status
```

Commenting on a draft matches zero rows, which the route turns into a 404. There
is no version of this code where somebody forgets the check, because there is no
separate check to forget.

The same shape covers the rest:

| Rule | Where it lives |
|---|---|
| Only published posts accept comments and likes | the `WHERE` of the insert |
| A reply belongs to its parent's post | `SELECT p.post_id` from the parent row |
| Replies are one level deep | `AND p.parent_id IS NULL`, plus two CHECK constraints |
| You may only edit your own comment | `AND c.user_id = $2` |
| …and only for fifteen minutes | `AND c.created_at > now() - interval …` |

Every one of those returns **404**, never 403 — the same answer a comment that
never existed gets, so no endpoint can be used to discover which ids are real.

---

## 3. Three guards, and only two of them are real

Learned the hard way during development. The admin layout called `notFound()` for
a non-administrator, and a non-administrator still received the dashboard's
numbers — because **Next renders a layout and its page concurrently**, so
`page.tsx` had already run its queries and streamed its markup before the
layout's refusal mattered.

| Layer | File | What it actually does |
|---|---|---|
| Middleware cookie check | `src/middleware.ts` | Bounces anonymous visitors before the server. Checks *presence*, not validity. **Not a boundary.** |
| Layout guard | `src/app/admin/layout.tsx` | Stops the shell rendering. Does not run for route handlers, and does not stop a page. |
| `requireAdminPage()` in every admin page | each `page.tsx` | Real. Runs before any read. |
| `requireAdmin(request)` in every admin handler | each `route.ts` | Real. The boundary for data. |

The route-handler check is repeated in every file rather than factored into a
wrapper, because a wrapper is a thing the next handler can forget to use and the
failure would be silent. The tests assert not just the status code but that **the
database mock was never called** on a refusal.

---

## 4. What renders where

The site was fully static before this feature and still is, apart from the admin.

| Route | Mode | Why |
|---|---|---|
| `/` | Static + ISR | Reads recent posts. Awaiting a server component does not make a route dynamic |
| `/blog` | Static + ISR | Page one. Publishing revalidates it directly |
| `/blog/page/[n]` | Prerendered per page | A route segment, not `?page=` — reading `searchParams` would opt the feed out of static rendering entirely |
| `/blog/[slug]` | Prerendered per slug + ISR | `dynamicParams` stays on, so a post published after the last build renders on first request |
| `/admin/**` | `force-dynamic`, noindex | Everything depends on who is asking |
| `/api/**` | `force-dynamic`, `no-store` | — |

The rule that keeps it that way: **`headers()` is banned from every public
route.** Anything session-dependent is fetched by a client component instead —
the header's user menu, the like button's own state, and which comments offer an
edit link. A per-visitor value in shared HTML is the quietest possible way to leak
one reader's state to another.

Two consequences worth knowing:

- The post body ships **zero** client JavaScript. `react-markdown` carries no
  `"use client"` of its own; the 207 kB that makes the chat renderer worth
  lazy-loading comes from that file's own directive, which it needs for a copy
  button.
- A `loading.tsx` at the app root would break HTTP status codes site-wide. It
  opens a Suspense boundary, the response streams, and the status is committed
  before `notFound()` can set it — every unknown URL under a dynamic route
  answered 200 with a loading page. It now lives only under `/ai`, which has no
  dynamic parameters and so no not-found case to break.

---

## 5. Modules

```
src/lib/auth/
  server.ts      Better Auth instance. The only file that constructs a Pool
  session.ts     getCurrentUser / requireUser / requireAdmin / requireAdminPage
  admin.ts       ADMIN_EMAILS allowlist. Pure, no I/O, exhaustively tested
  client.ts      "use client" — useSession, signIn, signOut

src/lib/db/
  posts.ts       every statement touching posts
  comments.ts    every statement touching post_comments, ownership included
  reactions.ts   the like toggle and its counts
  users.ts       readers and the block list. The only projection with an email

src/lib/blog/
  config.ts      env knobs, all with working defaults
  policy.ts      edit/delete permission and the moderation decision. Pure
  service.ts     cached reads. The only layer that swallows a database failure
  invalidate.ts  tag + path invalidation
  text.ts        slugify, excerpt, reading time, link counting. Pure

src/lib/content-editor/
  sections.ts    key → { file, schema } — schemas imported from src/content
  github.ts      read and commit one file through the Contents API

src/lib/http/guards.ts   same-origin, size cap, and the response shapes
```

The data modules deliberately **do not catch**. Resilience policy lives one layer
up in `service.ts`, exactly as `src/lib/rag/retrieval.ts` does for the assistant,
so a sleeping database degrades a section and never breaks a page.

---

## 6. Likes, in one statement

```sql
INSERT INTO post_reactions (post_id, user_id, active)
SELECT p.id, $1, TRUE FROM posts p
WHERE p.slug = $2 AND p.status = 'published' AND p.published_at <= now()
ON CONFLICT (post_id, user_id)
DO UPDATE SET active = NOT post_reactions.active, updated_at = now()
RETURNING active
```

Why this and not the alternatives:

- A `DELETE`-then-`INSERT` pair is two round trips with nothing around them.
- The data-modifying-CTE trick (`WITH removed AS (DELETE …), added AS (INSERT …
  WHERE NOT EXISTS …)`) rests on Postgres *not* guaranteeing execution order
  between sibling `WITH` sub-statements.

`ON CONFLICT DO UPDATE` takes a row lock on the conflict path, so concurrent taps
serialise. **Tested through the full HTTP stack: ten simultaneous requests leave
exactly one row.** `RETURNING active` hands the client the authoritative state,
which is what the optimistic button reconciles against instead of drifting.

Counts are `count(*)`, never a stored column. A cached counter needs
read-modify-write, which is precisely what has no transaction to protect it, and a
visibly wrong number is worse than a marginally slower query.

---

## 7. Administrator rights are configuration, not data

`ADMIN_EMAILS` is a comma-separated allowlist, compared by **exact equality
against a Set** — never `includes()` on the raw string, which would let
`owner@example.com.attacker.test` match `owner@example.com`. That case is a test.

| | env allowlist | a role column |
|---|---|---|
| Bootstrap | none needed | a first-admin path, which is new attack surface |
| Effect of a stolen database credential | none | the attacker promotes themselves |
| Effect of a SQL injection bug | none | possible escalation |
| Revocation | edit env, redeploy | one UPDATE (faster) |

The database stores only the *opposite* capability — `blocked_users`. Removal is
data; elevation is configuration. Unset or empty means **nobody** is an
administrator, including the owner: a deployment that forgets the variable locks
the panel rather than opening it.

---

## 8. Security

| Risk | Mitigation |
|---|---|
| Identity spoofing | The author is always `session.user.id`. Request schemas contain no `userId`/`authorName`/`status`, and zod strips unknown keys, so sending one is a no-op. Tested |
| Comment XSS | Bodies render as escaped plain text with `whitespace-pre-wrap`, never through a markdown renderer. A `<script>` payload was posted and appears escaped |
| Markdown injection in posts | Server-rendered `react-markdown`, no `rehype-raw`, default URL transform kept, `script`/`iframe`/`object`/`embed`/`style`/`img` disallowed |
| CSRF | Origin must match the **request's own host** (not the build-time `siteUrl`, which would reject preview deployments), plus a required JSON content type — which alone blocks cross-site form posts |
| IDOR | Ownership and the edit window are SQL predicates; the visitor-facing functions require a `userId` in their signature, so forgetting it is a type error |
| Unbounded nesting | `CHECK (depth IN (0,1))` + `CHECK ((parent_id IS NULL) = (depth = 0))` make two levels unrepresentable, and the insert's predicate rejects it |
| Draft leakage | Public reads filter `status = 'published' AND published_at <= now()` in the data layer; liking and commenting resolve the post through the same filter |
| Cross-user cache leakage | Nothing session-dependent enters `unstable_cache` or prerendered HTML; every authenticated response is `no-store` |
| Open redirect | `callbackURL` must match `/^\/(?!\/)/` — one leading slash, so `//evil.test` is refused |
| Spam | Sign-in required, per-**user** rate limits (IP is weak behind CGNAT), length bounds, a three-link heuristic that holds rather than rejects, and a block list |
| Secret exposure | `server-only` on every module that touches the database or a secret, so a client import fails the build. `.next/static` scanned for the auth secret, the database password, the OAuth secret and admin addresses: zero hits |
| Admin breaking the build | Content edits are validated against the same zod schemas the build uses, **before** the commit is made |

Deliberately deferred: a CSP. The inline `ThemeScript` needs a nonce, which in
Next 14 means middleware generation and a `force-dynamic` cost against an
all-static site. The rows above remove the injection *sources* rather than
mitigating them, which is the stronger position.

---

## 9. Editing the site's own content

Saving in `/admin/content` **writes a commit**. Three facts force it:

1. Content is imported at module scope and inlined at build time — that is what
   makes the portfolio pages static.
2. `profile` and `aiConfig` are imported by *client* components
   (`MobileNav`, `ChatPanel`, `BrandLoader`), which cannot await a server read.
3. Vercel's filesystem is read-only at runtime.

So the editor changes the same file a developer would, the build validates it as
before, and every edit is revertible with an author and a message. It costs a
minute or two of propagation, which is right for content that changes rarely.

Validation runs **before** the commit, against the schemas imported from
`src/content/schema.ts` — the same objects the build uses, not a copy. A document
that would fail the build is rejected with the offending field paths, so the
repository never receives a commit that breaks the site.

Concurrency is GitHub's: an update carries the blob SHA it replaces, and a stale
one comes back as a 409, passed through verbatim because it is the one failure a
person can fix themselves.

> **Note.** After a content edit the assistant still answers from the previous
> ingestion until `yarn ingest` runs. Worth adding a "rebuild index" action —
> which wants `chunking.ts` to take content as an argument rather than importing
> it, a change worth making on its own merits.

---

## 10. Setup

```bash
yarn db:migrate     # idempotent — safe to run repeatedly
yarn seed:blog      # two example posts, keyed by slug so re-runs update
```

Then set, in `.env.local` and in Vercel:

| Variable | For | Missing → |
|---|---|---|
| `DATABASE_URL` | posts, comments, sign-in | `/blog` shows an empty state; the site is unchanged otherwise |
| `BETTER_AUTH_SECRET` | session cookies | Sign-in disabled; the blog still reads |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Google sign-in | Sign-in disabled |
| `ADMIN_EMAILS` | the admin panel | **Fails closed** — nobody is an administrator |
| `GITHUB_TOKEN` / `GITHUB_REPO` | content editor | Editor is read-only |

Google OAuth client: Google Cloud console → APIs & Services → Credentials → OAuth
client ID (Web application), with both redirect URIs:

```
https://<your-site>/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

`BETTER_AUTH_SECRET`: `openssl rand -base64 32`.

GitHub token: a **fine-grained** PAT, repository access limited to this one
repository, permissions limited to *Contents: Read and write*. A classic token
with `repo` scope would reach every repository you can see, which this feature
has no need for.

Everything above is free tier.

---

## 11. Testing

Node-only Vitest, no jsdom, matching the existing setup.

| Kind | What it pins |
|---|---|
| Pure units | The allowlist (including the substring case), the edit-permission matrix, slugs, excerpts, relative time, the same-origin check |
| Data layer | Statement *shape and parameters* — that public reads filter on published, that every UPDATE sets `updated_at`, that ownership appears in the `WHERE`, and that values travel as driver parameters |
| Route handlers | 401/404/429, and that the database mock is **untouched** on a refusal |
| Browser (Playwright, on demand) | Focus traps, optimistic likes, comment submission, both themes, 375px, reduced motion, and rendering with JavaScript disabled |

Two things that are already tests: `yarn build`, whose route table shows whether
a page is still static, and `yarn db:migrate` run twice, which is both the
idempotency check and the check that no statement contains a semicolon the
splitter would break on.
