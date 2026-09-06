# API Reference

Every HTTP endpoint under `src/app/api`. A machine-readable version of this
same surface lives in [`postman/project-x.postman_collection.json`](../postman/project-x.postman_collection.json),
which you should import into Postman rather than re-typing any of this by
hand.

---

## Conventions

**Response envelope.** Almost every route returns one of two shapes:

```
{ "success": true,  ... }
{ "success": false, "error": "human-readable message", ...extra }
```

`POST /api/ai/chat` and `POST /api/contact` predate this convention (see
their own sections below) and use a bespoke shape instead. That's a known,
intentional inconsistency, not a bug to route around.

**Auth.** There is no bearer token anywhere in this API. Sign-in is Google or
LinkedIn OAuth through [Better Auth](https://better-auth.com), which sets an
HTTP-only session cookie; every authenticated route reads that cookie from
the request, never a header you construct by hand. Three tiers:

| Tier | Check | Failure |
|---|---|---|
| Public | none | n/a |
| Signed-in | `requireUser()` | 401 |
| Admin | `requireAdmin()`, checking the session email against `ADMIN_EMAILS` | 404 (not 401/403: a non-admin is told the route doesn't exist, not that it's forbidden) |

**CSRF / origin check.** Every mutating route (`POST`/`PATCH`/`PUT`/`DELETE`)
rejects a request whose `Origin` header doesn't match the request's own host
(`sameOrigin()` in `src/lib/http/guards.ts`), with a 400. A JSON body is also
required to declare `Content-Type: application/json`; file uploads
(`multipart/form-data`) are exempt from that second check, since the browser
sets that header itself.

**Rate limiting.** Per-IP or per-user, in-memory, per route: see each
endpoint below for its limit. A limited request gets a 429 with a
`Retry-After` header.

**Runtime.** Every route runs on the Node.js runtime (`runtime = "nodejs"`,
not Edge) with `dynamic = "force-dynamic"`, so nothing here is ever served
from a cache. The cache boundary in this app is the *pages* that call these
routes (see `revalidate` in the blog and content docs), not the API itself.

---

## Public

### `POST /api/contact`

Sends the contact-form email via Gmail SMTP (`nodemailer`). No auth.
Rate-limited to 5/hour per IP.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Let's talk",
  "message": "Hi, I saw your portfolio and wanted to reach out.",
  "company": ""
}
```

| Field | Constraint |
|---|---|
| `name` | 1-100 chars |
| `email` | valid email, ≤200 chars |
| `subject` | 1-200 chars |
| `message` | 10-5000 chars |
| `company` | must be empty: a honeypot field. A filled value returns a fake `200` without sending anything |

`200 { success: true, name }`. `400` invalid body (`fieldErrors`). `429`
rate limited. `503` `EMAIL_USER`/`EMAIL_PASS` not configured. `502` send
failed.

### `POST /api/ai/chat`

Streams an answer from the portfolio assistant. No auth. Rate-limited per IP
(`AI_RATE_LIMIT`/`AI_RATE_WINDOW`, defaults 10/60s).

```json
{ "messages": [{ "role": "user", "content": "What backend work has Alex done recently?" }] }
```

`messages` is a 1..`AI_MAX_HISTORY` array of `{ role: "user"|"assistant",
content: 1..AI_MAX_MESSAGE_LENGTH chars }`.

Success is a streamed `text/plain` body: the answer, optionally followed by
a sentinel and a JSON tail carrying source citations, with an
`X-Cache: HIT|MISS` response header. Every error here is `{ error: string }`
with no `success` key. `400` invalid body. `413` too large. `429` rate
limited (`Retry-After`). `503` `GEMINI_API_KEY` not configured. `502`
upstream failure. See [`docs/AI.md`](AI.md) for the retrieval pipeline behind
this endpoint.

### Blog reads and reactions

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/blog/posts/:slug/likes` | none (viewer optional) | 60/min per IP. `{ success, count, liked }`. 404 if the blog has no database, or the post is missing/unpublished |
| `POST /api/blog/posts/:slug/likes` | signed-in | 30/min per user. No body. Toggles the caller's own like |
| `POST /api/blog/posts/:slug/comments` | signed-in | body `{ body: string, parentId?: uuid }`, length bounded by `BLOG_COMMENT_MIN_LENGTH`/`MAX_LENGTH` (default 2-2000). `201` with `status: "visible"|"pending"` per the moderation policy. `403` if blocked (doesn't say why). `404` post/parent missing, unpublished, or hidden |
| `PATCH /api/blog/comments/:id` | signed-in, own comment | body `{ body: string }`. Only within `BLOG_COMMENT_EDIT_WINDOW_MINUTES` (default 15) of posting. `404` for someone else's comment, an expired window, or a withdrawn comment: the three are never distinguished |
| `DELETE /api/blog/comments/:id` | signed-in, own comment | soft delete, no time limit |

The full authorization model (why these are SQL predicates, not
check-then-act code) is in [`docs/BLOG.md`](BLOG.md).

### App downloads

| Endpoint | Notes |
|---|---|
| `GET /api/apps/:slug/download` | Streams the app's latest GitHub release `.apk` through this origin. 20/5min per IP. `404` no repo configured for that app. `503` `APPS_GITHUB_TOKEN` unset. `502` GitHub-side failure |
| `GET /api/apps/:slug/download/:tag` | Same, pinned to one release tag |

---

## Auth (Better Auth)

`GET|POST /api/auth/[...all]` hands every path under `/api/auth/` to Better
Auth's own handler: sign-in, the OAuth callback, session lookup, sign-out.
This document does not re-document that surface sub-route by sub-route,
since it belongs to the library, not this app. `GET /api/auth/get-session`
is the one most worth knowing by name, since it's what confirms whether a
client is actually authenticated. A `503 { success:false, error:"Sign-in
isn't available right now." }` from anything under this prefix means
`BETTER_AUTH_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` aren't all
set. Sign-in is optional and nothing else on the site depends on it.

---

## Admin: Posts

Every route below requires an admin session (404 otherwise).

| Endpoint | Body | Notes |
|---|---|---|
| `GET /api/admin/posts` | n/a | `{ success, posts }` |
| `POST /api/admin/posts` | `{ title?, slug, body, excerpt?, tags? }` | `201`. `409` on a duplicate slug |
| `PATCH /api/admin/posts/:id` | same shape | `404` missing. `409` duplicate slug |
| `DELETE /api/admin/posts/:id` | n/a | cascades comments/reactions, deletes the cover image, best-effort un-shares from LinkedIn |
| `POST /api/admin/posts/:id/status` | `{ action: "publish"\|"unpublish"\|"pin"\|"unpin" }` | publish's response includes `linkedIn: "shared"\|"not_connected"\|"skipped"\|"failed"` |
| `PATCH /api/admin/posts/:id/linkedin-caption` | `{ commentary: string ≤3000 }` | `synced: true` means an already-live LinkedIn post was updated in place |
| `POST /api/admin/posts/:id/cover-image` | multipart `file` (image/\*, ≤4MB) | replacing the cover clears every extra gallery photo |
| `DELETE /api/admin/posts/:id/cover-image` | n/a | |
| `POST /api/admin/posts/:id/linkedin-images` | multipart `file` + `altText?` | requires a cover image first (`400`) and LinkedIn connected (`503`); caps at 8 extras |
| `DELETE /api/admin/posts/:id/linkedin-images` | `{ index: number }` | index into the *current* list; the server always re-reads it first |
| `POST /api/admin/posts/:id/linkedin-document` | multipart `file` (any type, ≤4MB) | requires LinkedIn connected |
| `DELETE /api/admin/posts/:id/linkedin-document` | n/a | |

`postInputSchema` field constraints (create/update): `title` ≤200 (default
`""`), `slug` 1-80 chars lowercase kebab-case (required), `body` 1-100000
chars (required), `excerpt` ≤400 (auto-derived from `body` when empty),
`tags` up to 8 strings of 1-30 chars each.

## Admin: Comments & Users

| Endpoint | Body | Notes |
|---|---|---|
| `PATCH /api/admin/comments/:id` | `{ action: "approve"\|"hide" }` | |
| `DELETE /api/admin/comments/:id` | n/a | hard delete, cascades replies. No undo, unlike a reader's own soft-delete |
| `POST /api/admin/users/:id/block` | `{ reason?: string ≤200 }` | `400` if the target is the acting admin's own account |
| `DELETE /api/admin/users/:id/block` | n/a | unblock |

## Admin: Content editor

Backs `/admin/content`, the browser-based editor for `src/content/*.json`.
Saving writes a real commit to GitHub: that commit *is* the publish step,
which is what deploys the change. Requires `GITHUB_TOKEN`/`GITHUB_REPO`
(`503` otherwise).

| Endpoint | Body | Notes |
|---|---|---|
| `GET /api/admin/content/:section` | n/a | `:section` ∈ `profile\|experience\|projects\|apps\|skills\|education\|ai` (`404` otherwise). Returns `{ data, sha }` |
| `PUT /api/admin/content/:section` | `{ data: unknown, sha: string }`, ≤512KB | `data` is validated against that section's own zod schema *before* any GitHub call. `400` with `issues` on a shape mismatch. `409` if `sha` is stale: someone else saved first, so re-`GET` and reapply your change |
