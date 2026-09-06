# Portfolio: Alemayehu "Alex" Mekonen

Personal site and engineering portfolio: an AI assistant that answers
questions about the work from structured content, a blog with sign-in, likes,
comments and LinkedIn cross-posting, and an admin panel that edits both.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Framer Motion · Gemini · Better Auth · Neon Postgres (pgvector) · Vercel Blob ·
PostHog · Vercel

**Package manager: pnpm, exclusively.** A `preinstall` hook fails fast if
`npm install` or `yarn install` is run by mistake. See
[Package management](#package-management) below.

---

## Quick start

```bash
git clone https://github.com/alexdev93/project-x.git
cd project-x
pnpm install
cp .env.example .env.local   # then fill in the values, see Environment variables
pnpm dev
```

The site is now at `http://localhost:3001` (see [Environment variables](#environment-variables)
for why 3001, not Next's default 3000). Every feature below the home page,
the blog, sign-in, the AI assistant, and analytics, is **optional and
additive**: with no environment variables configured at all, the site still
builds and runs, just without those features. Nothing here blocks a first
run.

## Full flow: clone to deploy

The end-to-end path from a fresh clone to a change running in production.

```bash
# 1. Set up once
git clone https://github.com/alexdev93/project-x.git
cd project-x
pnpm install
cp .env.example .env.local        # fill in what you need, see below

# 2. Work on a branch
git checkout -b my-change
pnpm dev                          # local dev server, http://localhost:3001

# 3. Verify before pushing: this is exactly what CI runs
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build

# 4. If you touched src/lib/db/schema.sql, apply it locally first
pnpm db:migrate

# 5. Commit and push
git add -A
git commit -m "Describe the change"
git push -u origin my-change

# 6. Open a pull request against main
gh pr create --fill        # or use the GitHub UI

# 7. CI runs automatically (lint, typecheck, test, build; see docs/CI_CD.md)
#    Vercel also builds a preview deployment for the PR automatically.

# 8. Merge once CI is green and the preview looks right
#    - Vercel deploys the merge commit to production immediately.
#    - If the PR touched schema.sql, migrate.yml applies it to the
#      production database in parallel; see docs/CI_CD.md for why the
#      ordering between the two doesn't matter here.
```

Full detail on each CI/CD mechanism, what triggers it, and what happens when
one fails: [`docs/CI_CD.md`](docs/CI_CD.md).

## Package management

Everything goes through pnpm. There is no `package-lock.json` or
`yarn.lock` in this repo (a stray `yarn.lock` was removed; see the
`preinstall` script in `package.json` if you're wondering why an accidental
`npm install` refuses to run).

```bash
pnpm install                     # install everything from pnpm-lock.yaml
pnpm add <package>                # add a runtime dependency
pnpm add -D <package>              # add a dev dependency
pnpm remove <package>              # remove a dependency
pnpm update <package>              # update one package to the latest allowed by its semver range
pnpm update --latest <package>     # update one package past its semver range, to the actual latest
pnpm up --latest                  # update everything in package.json to latest (review the diff before committing)
pnpm list                         # show the installed dependency tree
pnpm list <package>                 # show where one package is resolved from, and its version
pnpm outdated                     # show what has newer versions available
pnpm why <package>                  # show what pulled a package in, for a transitive dependency
```

After `add`/`remove`/`update`, both `package.json` and `pnpm-lock.yaml`
change; commit both together, always. CI's `pnpm install --frozen-lockfile`
step fails on purpose if they've drifted apart (see
[`docs/CI_CD.md`](docs/CI_CD.md#1-ci-the-correctness-gate-ciyml)).

`engines.node` in `package.json` requires Node ≥22; `.nvmrc` pins the exact
version for `nvm use`.

## Environment variables

Every variable this app reads is documented, one by one, with why it exists
and what happens when it's absent, in [`.env.example`](.env.example): that
file is the source of truth, and the table below is only an index into it.

This project keeps its real secrets in a personal **env-vault** rather than a
plaintext `.env.local` on every machine. `pnpm dev`/`pnpm start`/`pnpm db:migrate`
already wrap themselves with `envvault run project-x -- ...`, so once the
vault is set up, nothing in `.env.local` needs a real secret in it at all:

```bash
# one-time setup on a new machine
curl -fsS https://env-vault-api.alexdev93.workers.dev/install.sh | sh
envvault login    # paste the vault URL + your API token
```

Without vault access, fill in `.env.local` directly instead: every command
falls back to plain `dotenv` values when the vault has nothing for a key.
`.env.local` is git-ignored and never leaves your machine. Two variables
(`PORT`, `NEXT_PUBLIC_SITE_URL`) belong there and only there even *with*
vault access, since they're genuinely per-environment rather than shared
config; see the bottom of `.env.example` for why.

| Area | Key variables | Required for |
|---|---|---|
| AI assistant | `GEMINI_API_KEY`, `AI_MODEL` | the `/ai` page and chat widget |
| Vector retrieval | `DATABASE_URL`, `AI_EMBEDDING_MODEL` | source citations in AI answers (optional: the assistant still answers without them) |
| Sign-in | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | the blog's comments/likes and `/admin` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | cross-posting a published post |
| Cover images | `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY` | a post's cover image and LinkedIn thumbnail |
| Admin access | `ADMIN_EMAILS` | `/admin`. **Empty means nobody**, including you |
| Content editor | `GITHUB_TOKEN`, `GITHUB_REPO` | saving from `/admin/content` |
| App downloads | `APPS_GITHUB_TOKEN` | the private-repo APK download button |
| Contact form | `EMAIL_USER`, `EMAIL_PASS` | `/contact` |
| Analytics | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | pageview/click/event tracking |

These must also be set in **Vercel → Settings → Environment Variables** for
the deployed site. The vault and Vercel's own environment variables are two
separate stores that both need the same values.

## Database usage

Neon Postgres, reached through its HTTP driver rather than a persistent
connection. The full reasoning (no transactions, no connection pool to
exhaust from a serverless function) is in
[`docs/BLOG.md`](docs/BLOG.md#1-the-constraint-that-shapes-everything).
`DATABASE_URL` is optional everywhere it's used: without it the blog shows an
empty state and the AI assistant just omits source citations. Nothing
throws.

```bash
pnpm db:migrate     # apply src/lib/db/schema.sql, idempotent, safe to re-run
pnpm seed:blog      # two example posts, keyed by slug so re-runs update rather than duplicate
pnpm ingest         # (re)build the AI assistant's embeddings from src/content

pnpm ingest --dry-run   # print the chunk plan without touching the database or calling the embedding API
pnpm ingest --force     # re-embed every chunk, not just ones whose content changed
```

There is no migrations directory or framework: schema changes are additive
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements appended to
`src/lib/db/schema.sql` itself. See
[`docs/BACKEND.md`](docs/BACKEND.md#database-schema) for the table-by-table
shape, and [`docs/CI_CD.md`](docs/CI_CD.md#2-schema-migration-migrateyml) for
how a schema change reaches production automatically on merge.

## CI/CD

Three independent mechanisms: a correctness gate (lint/typecheck/test/build)
on every push and PR, a schema-migration workflow that only fires when
`schema.sql` changes on `main`, and Vercel's own Git integration handling the
actual deploy. None of these are the same system, and conflating them is the
most common way to misread a broken pipeline. Full explanation, with the
reasoning behind each design choice: [`docs/CI_CD.md`](docs/CI_CD.md).

## API

Every endpoint under `src/app/api`, with auth requirements, request/response
shapes, and rate limits: [`docs/API.md`](docs/API.md). A ready-to-import
Postman collection covering the same surface lives at
[`postman/project-x.postman_collection.json`](postman/project-x.postman_collection.json)
(companion environment: `postman/project-x.postman_environment.json`).

## Architecture

```
src/
  app/                 routes: content pages are statically generated
    api/                every backend endpoint, see docs/API.md
    admin/              admin panel: posts, comments, users, content editor
    blog/               the public feed and post pages
  content/              all editorial content + zod schemas
  components/
    ui/                 design primitives: Button, Card, Section, Reveal, …
    layout/              Header, MobileNav, SiteFooter, SkipLink
    home/                home page sections
    blog/                feed, post, comment thread and form
    admin/               admin panel UI
    chat/                assistant UI
    theme/               theme provider and toggle
  lib/
    ai/                  provider abstraction + RAG pipeline, see docs/AI.md
    auth/                Better Auth setup and session helpers
    blog/                blog config, policy, service, see docs/BLOG.md
    db/                  schema.sql + typed query functions
    linkedin/            LinkedIn OAuth, publishing, relinking
    media/               Vercel Blob wrapper (cover images)
    apps/                private-repo APK download proxy
    http/                shared request guards (origin check, rate limit, errors)
    rate-limit/          the shared per-IP/per-user limiter
  hooks/                 useChat, useFocusTrap
```

For the backend specifically, including rate limiting, the LinkedIn
integration, file storage, the app-download proxy, the full database schema,
and how auth and admin rights actually work: see
[`docs/BACKEND.md`](docs/BACKEND.md).

### AI provider

`src/lib/ai/provider.ts` defines a narrow `ChatProvider` interface.
`src/lib/ai/gemini.ts` is the only file that knows the model is Google's. To
move to another provider, add an implementation and change one line in
`src/lib/ai/index.ts`.

The API key is read on the server inside the provider only. It is never
referenced from a client component and is never a `NEXT_PUBLIC_` variable.

The assistant is grounded in the portfolio content: it answers from
`src/content`, may reason across it, and is instructed not to invent
experience. See [`docs/AI.md`](docs/AI.md) for the retrieval pipeline and why
this corpus deliberately doesn't use classic top-K RAG.

### Design system

Colour, radius, shadow and font tokens are defined once in
`src/app/globals.css` and exposed to Tailwind via `@theme`. Components use
tokens, never raw hex. Light and dark are both first-class; the theme is
applied before first paint by an inline script (no flash), and switching
between them cross-fades rather than hard-cutting.

Every foreground/background pair is checked against WCAG 2.1 AA.

## Changing the content

**You do not need to touch a component to change what the site says.**
Everything lives in [`src/content`](src/content) as JSON; see
[`src/content/README.md`](src/content/README.md) for what each file
controls. Editing those files from the browser is what `/admin/content`
does; it saves by committing directly to this repository, which is what
triggers the deployment. See [`docs/BLOG.md`](docs/BLOG.md) and
[`docs/API.md`](docs/API.md#admin-content-editor).

| File | Controls |
|---|---|
| `profile.json` | Name, role, tagline, bio, focus areas, contact, CV, socials |
| `experience.json` | Work timeline |
| `projects.json` | Project cards and case-study pages |
| `skills.json` | Tech stack, grouped by depth |
| `education.json` | Degrees, programmes, certifications |
| `ai.json` | Assistant greeting, suggested prompts, behaviour rules |

Content is validated against a zod schema at build time, so a typo fails the
build with the exact path rather than shipping a broken page.

Stat figures on the home page are **derived** from this content (years,
organisations, technologies, services). Add a role and they update
themselves.

## The blog and admin panel

An X-style feed at `/blog`, with Google sign-in, likes, comments and one
level of replies, plus optional cross-posting to LinkedIn on publish.
`/admin` manages posts, moderates comments, lists and blocks readers, and
edits the portfolio content above.

The design and its reasoning, including why there are no transactions, why
authorization is expressed as a SQL join, and which of the admin guards are
real, is in [`docs/BLOG.md`](docs/BLOG.md).

## Commands

```bash
pnpm dev     # development server
pnpm build   # production build (also validates content)
pnpm start   # serve the production build
pnpm lint    # eslint
pnpm test    # vitest
pnpm test:watch

pnpm db:migrate   # apply src/lib/db/schema.sql (idempotent)
pnpm seed:blog    # two example posts (re-runnable)
pnpm ingest       # rebuild the assistant's embeddings after a content change
```

## Production readiness

What's already true of this repo, not a checklist to complete:

- **Everything degrades, nothing throws.** No `DATABASE_URL` means the blog
  shows an empty state and the assistant just skips citations. No
  `GEMINI_API_KEY` means the assistant returns a clear "not configured yet"
  message. No admin emails configured means `/admin` is unreachable, not
  broken.
- **`pnpm audit` is clean** at every severity level, and every dependency not
  bumped to its absolute latest has a documented reason (an unreleased
  ecosystem incompatibility, not neglect). See the dependency bump commits
  on this branch for specifics.
- **CI is a real gate**, not a formality: lint, typecheck, tests and a
  production build all have to pass before a PR is mergeable in practice
  (branch protection is a repository setting, not something committed here).
- **One package manager, enforced at install time**, not just by convention.
- **Secrets never touch this repository.** The env-vault is the single
  source of truth for local dev, CI, and the deployed site; `.env.local` and
  `.env.example` are the only files that even mention environment variable
  *names*.

## Brand

The identity lives in [`public/brand/`](public/brand/), with the full
rationale in
[`public/brand/BRAND_GUIDELINES.md`](public/brand/BRAND_GUIDELINES.md).

The mark is an **A built from two strokes that never touch**: a crossbar
bridges them, and that bridge is the only thing making them a letter. It
reads as a precise geometric A on its own; the Gemini duality is there for
anyone who looks twice.

In code, use the component rather than the files. It inherits
`currentColor`, so one implementation serves both themes:

```tsx
import { AlexLogo } from "@/components/brand/AlexLogo";

<AlexLogo />                     // lockup
<AlexLogo variant="icon" />      // mark only
<AlexLogo variant="wordmark" />  // wordmark only
<AlexLogo animated />            // one-shot mount animation
```

Geometry is generated, not duplicated: `scripts/build-brand.py` writes both
the SVGs in `public/brand/` and `src/components/brand/geometry.ts`, so the
assets and the component cannot drift apart. Don't hand-edit either; change
the script and re-run it:

```bash
pip install fonttools brotli
pnpm build                         # emits Inter's woff2 for outline extraction
python3 scripts/build-brand.py     # SVGs + geometry.ts
node scripts/build-brand-png.js    # PNG exports (needs playwright)
```

## Replacing the portrait

`public/portrait.webp` is a background-free cutout, so it sits on whatever
surface the current theme provides and works in light and dark from one
asset.

To swap in a new photograph, replace `assets/portrait-source.jpg` and re-run:

```bash
pip install pillow numpy scipy
python3 scripts/build-portrait.py
```

This is a one-off asset tool, not part of `pnpm build`: the committed
`.webp` is what the site loads. It expects a studio-style photo on a plain,
evenly lit backdrop; see `scripts/_matte.py` for how the matte is derived
and what it assumes. For a photo shot against a busy background, cut it out
by hand instead and save the result as `public/portrait.webp`.
