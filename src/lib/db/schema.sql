-- Database schema: assistant knowledge base, authentication, and the blog.
--
-- Apply with:  yarn db:migrate
-- Safe to re-run: every statement is guarded.
--
-- Three rules this file follows, all of them forced by how it is applied. The
-- migrate script splits on semicolons at line ends and sends one statement per
-- HTTP request, so: no `$$`-quoted bodies, no DO blocks, and no triggers or
-- stored functions. `updated_at` is therefore maintained in application code,
-- not by a trigger — every UPDATE in src/lib/db/*.ts sets it explicitly.
--
-- Dimension note: the vector width must match AI_EMBEDDING_DIMENSIONS (default
-- 768). Changing that setting requires recreating the column, because pgvector
-- fixes dimensionality per column — see docs/AI.md.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  -- Deterministic, derived from source and ordinal ("projects/zemenawi-crm#0"),
  -- so re-ingesting updates rows in place instead of accumulating duplicates.
  id           TEXT PRIMARY KEY,
  content      TEXT NOT NULL,
  source       TEXT NOT NULL,
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  -- Hash of `content`; lets ingestion skip embedding work for unchanged chunks.
  content_hash TEXT NOT NULL,
  embedding    VECTOR(768) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filtering by category is cheap and common ("only search projects").
CREATE INDEX IF NOT EXISTS knowledge_chunks_category_idx
  ON knowledge_chunks (category);

-- No ANN index on purpose.
--
-- An HNSW or IVFFlat index only pays off in the thousands of rows; this table
-- holds a couple of dozen. A sequential scan with exact cosine distance is both
-- faster here and perfectly accurate, whereas an ANN index would add build
-- cost, memory, and approximate results for no gain. Revisit past ~5k rows.


-- ---------------------------------------------------------------------------
-- Authentication (Better Auth)
-- ---------------------------------------------------------------------------
--
-- GENERATED, NOT HAND-WRITTEN. Produced by `npx @better-auth/cli generate`
-- against better-auth@1.7.1 and transcribed here verbatim except for the added
-- IF NOT EXISTS guards. A column that does not match what the library expects
-- makes it misbehave in ways that are hard to trace, so on a Better Auth upgrade
-- re-run the generator and diff rather than editing these by hand.
--
-- Two things about the shape are worth knowing before writing a query against
-- them:
--
--  * The table names are `auth_*` because Better Auth's default name for the
--    first one is `user`, which is reserved in Postgres. Renaming was cheaper
--    than quoting it forever, and it makes library-owned tables obvious.
--  * The columns are quoted camelCase, which is the library's convention and
--    the opposite of ours. Anything selecting `"emailVerified"` needs the
--    quotes. Our own tables below stay snake_case; two owners, each internally
--    consistent, with the boundary visible in the name.

CREATE TABLE IF NOT EXISTS "auth_user" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL,
  "image"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "auth_session" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "auth_user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "auth_account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "issuer"                TEXT NOT NULL DEFAULT '',
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "auth_user" ("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "auth_verification" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Session validation is the hottest query in the application; the rest are the
-- generator's own choices.
CREATE INDEX IF NOT EXISTS "auth_session_userId_idx" ON "auth_session" ("userId");
CREATE INDEX IF NOT EXISTS "auth_account_userId_idx" ON "auth_account" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_account_issuer_accountId_idx"
  ON "auth_account" ("issuer", "accountId");
CREATE INDEX IF NOT EXISTS "auth_verification_identifier_idx" ON "auth_verification" ("identifier");


-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------
--
-- The governing constraint for every write below: there are no transactions.
-- The HTTP driver issues one stateless request per statement, so a write is only
-- safe if its effect is a function of current state rather than of a value read
-- a moment earlier. In practice that means no counter deltas, `ON CONFLICT DO
-- UPDATE` in place of read-then-branch, and cross-row invariants expressed as
-- the WHERE clause of an INSERT ... SELECT. The CHECK constraints here exist so
-- those invariants hold even if a future query forgets them.
--
-- gen_random_uuid() is core Postgres from 13 onwards — no extension, and no
-- function body for the migrate splitter to trip over.

CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  -- Feed posts are allowed to have no title, the way a short thought does not.
  title           TEXT NOT NULL DEFAULT '',
  excerpt         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  reading_minutes SMALLINT NOT NULL DEFAULT 1,
  -- Set on publish. A future value schedules the post: the public filter is
  -- `published_at <= now()`, so scheduling costs no extra column and no cron.
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Makes "published with no date" unrepresentable, so the feed's date filter
  -- can never silently hide a published post.
  CHECK (status = 'draft' OR published_at IS NOT NULL)
);

-- Partial, because every public read filters on published. Matches the feed's
-- exact ORDER BY, so the sort is free.
CREATE INDEX IF NOT EXISTS posts_feed_idx
  ON posts (pinned DESC, published_at DESC) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES post_comments (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES "auth_user" ("id") ON DELETE CASCADE,
  body       TEXT NOT NULL,
  depth      SMALLINT NOT NULL DEFAULT 0 CHECK (depth IN (0, 1)),
  status     TEXT NOT NULL DEFAULT 'visible'
             CHECK (status IN ('visible', 'pending', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at  TIMESTAMPTZ,
  -- Ties depth to the truth about parent_id so it cannot lie. With the CHECK
  -- above it, a comment nested two levels deep is unrepresentable — the reply
  -- limit is a schema guarantee, not an API convention.
  CHECK ((parent_id IS NULL) = (depth = 0))
);

CREATE INDEX IF NOT EXISTS post_comments_post_idx
  ON post_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS post_reactions (
  post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES "auth_user" ("id") ON DELETE CASCADE,
  -- A like is toggled by flipping this rather than by deleting the row, which is
  -- what lets one statement serve both directions. See src/lib/db/reactions.ts.
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The composite key is what makes liking idempotent: a double-click or a
  -- retried request conflicts with itself instead of counting twice.
  PRIMARY KEY (post_id, user_id)
);

-- Moderation's blunt instrument. Note the asymmetry with administrator rights,
-- which live in ADMIN_EMAILS and deliberately not here: the database stores the
-- removal of a capability, never the grant of one. A compromised database
-- cannot make anyone an admin.
CREATE TABLE IF NOT EXISTS blocked_users (
  user_id    TEXT PRIMARY KEY REFERENCES "auth_user" ("id") ON DELETE CASCADE,
  reason     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes deliberately omitted, in the same spirit as the note above about ANN:
--
--  * post_reactions (user_id) — nothing reads reactions by user alone. "Did I
--    like this?" uses the whole primary key; "how many likes?" uses its leading
--    column. A second index would be write cost for no read.
--  * post_comments (parent_id) — a thread is fetched by post_id in one query and
--    grouped into two levels in application code. Children are never looked up
--    by parent.
--  * GIN on posts.tags, and any full-text index — filtering or searching across
--    tens of posts is a scan over a few kilobytes. Revisit past a few hundred.


-- ---------------------------------------------------------------------------
-- Evolutions
-- ---------------------------------------------------------------------------
--
-- There is no migration versioning here, and adding a framework would be worse
-- than not having one given the lack of transactions. The convention instead:
-- additive changes go at the bottom of this file as
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`, which is core Postgres,
-- idempotent, and one statement — so `yarn db:migrate` stays literally safe to
-- re-run. Column removals and type changes stay manual and deliberate, recorded
-- here with the date they were applied.
--
-- 2026-08-20 — "auth_account" was first transcribed missing the "issuer"
-- column, which better-auth@1.7.1 requires (accounts are keyed by
-- (issuer, accountId), not just (providerId, accountId) — see
-- https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer).
-- The omission surfaced in production as `column auth_account.issuer does not
-- exist` on every Google callback. The CREATE TABLE above is already fixed for
-- new databases; this statement carries existing ones forward.
ALTER TABLE "auth_account" ADD COLUMN IF NOT EXISTS "issuer" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS "auth_account_issuer_accountId_idx"
  ON "auth_account" ("issuer", "accountId");
