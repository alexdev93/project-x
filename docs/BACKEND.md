# Backend Architecture

A map of everything under `src/lib` and `src/app/api` that isn't already
covered in depth elsewhere:

- The blog's data model, authorization pattern, and the no-transactions rule
  that shapes every write in the app: [`docs/BLOG.md`](BLOG.md)
- The AI assistant's retrieval pipeline: [`docs/AI.md`](AI.md)
- The full endpoint-by-endpoint request/response reference: [`docs/API.md`](API.md)

This document covers the rest: rate limiting, the LinkedIn integration, file
storage, the private-repo app-download proxy, the database schema as a
whole, auth internals, and the shared HTTP guards every route is built from.

---

## Request flow

Every mutating route follows the same fixed order, enforced by
`src/lib/http/guards.ts`:

```
rate limit → same-origin check → size cap → JSON parse → zod validation
  → authenticate → authorize → do the work
```

Cheapest checks first, so an abusive or malformed request never reaches a
database call. `checkRequest()` bundles the origin/content-type/size/parse
steps into one call returning `{ body, response }`: a route either gets a
parsed, validated body or an early `response` to return as-is.

`notFound()` (a plain 404) is deliberately reused for three different real
situations: the resource genuinely doesn't exist, it exists but isn't yours,
and it exists but you're not permitted to see it. Collapsing all three into
one response means no endpoint can be used to enumerate someone else's data
by comparing 404 against 401/403. `databaseError()` maps Postgres's unique
violation (`23505`) to a `409` (slug already taken, most commonly); anything
else becomes a generic `500` with detail only in the server log, never the
response body.

`sameOrigin()` compares the `Origin` header against the request's own
`Host`/`X-Forwarded-Host`, not the build-time `NEXT_PUBLIC_SITE_URL`, which
is also what makes it work correctly on every Vercel preview deployment
without extra configuration per branch.

## Rate limiting

`src/lib/rate-limit.ts` is a fixed-window limiter over an in-memory
`Map<string, { count, resetAt }>`. It is explicitly a per-instance abuse
dampener, not a strict global quota: a serverless deployment runs multiple
instances, each with its own counters that reset on cold start, so the real
ceiling under load is looser than the configured number suggests. That's an
accepted tradeoff, not an oversight: the alternative (a shared store like
Redis) is infrastructure this app doesn't otherwise need. The map self-evicts
expired entries once it exceeds 512, with no background timer.

`clientKey(request, prefix)` buckets by the leftmost IP in `x-forwarded-for`
(set by Vercel's edge), falling back to one shared `"unknown"` bucket when
the header is absent, failing toward *stricter* shared limiting rather than
no limiting at all.

## LinkedIn integration

Connecting an account uses Better Auth's `genericOAuth` plugin (registered in
`src/lib/auth/server.ts`) rather than a first-class sign-in provider: an
already-signed-in admin links LinkedIn explicitly from `/admin`, and nobody
signs *in* with it. Reading the linked account and its access token
(`src/lib/linkedin/account.ts`) goes through Better Auth's own API
(`listUserAccounts`/`getAccessToken`), which handles decryption and refresh.
The token is never read from the `auth_account` table directly, since it's
encrypted at rest there.

Publishing is three layers:

- `content.ts` (`buildLinkedInContent`) decides the post's *shape* from the
  post's current database state: a document or one-or-more images promote it
  to a real media/multiImage post, with the blog link folded into the
  commentary text, since LinkedIn's article-preview and media types are
  mutually exclusive. With neither, it falls back to a plain article
  link-preview card.
- `assets.ts` uploads images/documents straight to LinkedIn's own asset
  storage (`initializeUpload` then a `PUT`, a two-step flow). Nothing is
  cached on this app's side.
- `share.ts` makes the actual REST calls (create / update commentary /
  delete) against `api.linkedin.com/rest/posts`.

**Relinking** (`relink.ts`) exists because LinkedIn's partial-update API can
only edit a post's text, never its attached media. Any change to what's
attached (a new cover image, an edited gallery) has no in-place API path, so
the app deletes the old LinkedIn post and creates a new one, then stores the
new URN. This is the mechanism behind the `relinked: boolean` field returned
by every cover-image/gallery/document endpoint in
[`docs/API.md`](API.md#admin-posts).

## File storage (Vercel Blob)

`src/lib/media/blob.ts` wraps `@vercel/blob`'s `put`/`del` for cover images
only; there is no other file storage in the app. Path convention:
`posts/{postId}/cover-{Date.now()}`, publicly readable. The timestamp suffix
means a replacement image never collides with the one it's replacing; the
calling route is responsible for deleting the old blob once the new one is
saved. There's no local-disk fallback, which also means this path can't be
exercised in a sandbox with no network route to Vercel's Blob service.

## Private-repo app downloads

`src/lib/apps/releases.ts` authenticates to GitHub with a fine-grained PAT
(`APPS_GITHUB_TOKEN`, Contents: read-only) and calls either
`/releases/latest` or `/releases/tags/:tag`, locates the `.apk` release
asset, then re-fetches that asset's URL with
`Accept: application/octet-stream` to get the actual binary, with
`cache: "no-store"` throughout so "latest" is never served stale.
`download.ts` holds the two API routes' shared plumbing: the 20-per-5-minutes
rate limit and the streamed `Response` itself
(`Content-Type: application/vnd.android.package-archive`,
`Content-Disposition: attachment`). The route streams that response back
through this site's own origin, so a visitor downloading a private app's APK
is never redirected to, or authenticated against, github.com.

## Database schema

No migration framework: `src/lib/db/schema.sql` is applied directly
(`pnpm db:migrate`), and every statement in it is written to be safe to
re-run (see the file's own header and [`docs/CI_CD.md`](CI_CD.md#2-schema-migration-migrateyml)).
Schema changes since the first version are additive
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements appended to the same
file, dated inline, rather than a separate migrations directory.

| Table | Purpose | Worth knowing |
|---|---|---|
| `knowledge_chunks` | AI assistant's retrieval corpus | `VECTOR(768)` (pgvector); deliberately has no ANN index below roughly 5k rows, see `docs/AI.md` |
| `auth_user`, `auth_session`, `auth_account`, `auth_verification` | Better Auth's own tables | Generated by the Better Auth CLI, not hand-written; camelCase, quoted identifiers |
| `posts` | Blog posts | `status` CHECK (`draft`/`published`); `published_at` doubles as a future-dated scheduler, so publishing ahead of time needs no cron, just a `WHERE published_at <= now()` on every read |
| `post_comments` | Comments and replies | A CHECK tying `depth` to `parent_id IS NULL` makes "exactly one level of replies" a schema guarantee, not just application logic |
| `post_reactions` | Likes | Composite primary key `(post_id, user_id)` makes liking idempotent by construction; an `active` boolean is toggled rather than the row being deleted and reinserted |
| `blocked_users` | Comment-blocking | Admin rights are never a table here or anywhere else, see below |
| `post_linkedin_images` | Extra gallery photos | Extras only; the cover image is always logical photo #1, stored on `posts` itself |

## Auth internals

Better Auth reaches Postgres through a dedicated Kysely-compatible `Pool`
capped at one WebSocket connection (`src/lib/auth/server.ts`), the sole
exception in this codebase to the stateless-HTTP-driver, no-transactions
rule that governs every other database write (full reasoning in
[`docs/BLOG.md`](BLOG.md#1-the-constraint-that-shapes-everything)).

`requireUser()` returns a 401 result when there's no session.
`requireAdmin()` returns 404, not 401 or 403, both when there's no session
*and* when there is one but the account isn't an admin, so the existence of
the admin surface isn't discoverable by an unprivileged, signed-in account
probing it.

**Admin rights are configuration, never data.** `isAdmin()` checks the
`ADMIN_EMAILS` environment variable exclusively, recomputed on the server on
every request. There is no `is_admin` column anywhere, and no SQL write path
could grant the capability even if one wanted to. A `customSession` plugin
also stamps `isAdmin` onto the session object the client can read, but that
copy is for UI purposes only (showing/hiding admin nav) and is never trusted
as the actual authorization check.

Two ways of reading the current user exist for a reason. `getCurrentUser()`
calls Next's `headers()`, which forces dynamic rendering: fine for admin
pages, which are dynamic anyway, but exactly the cost the public blog pages
are built to avoid (see the note on this in `docs/BLOG.md` about why a post
page never reads the session on the server). Route handlers instead use
`getSessionFromRequest()`, which reads headers already in hand from the
`Request` object and carries no such cost.

## No background jobs

Everything in this app is strictly request-response. There is no cron job,
queue, or worker anywhere in the codebase. A scheduled/future-dated post
(see `posts.published_at` above) becomes visible purely because every read
filters on the current time, not because anything runs on a timer to flip a
status.
