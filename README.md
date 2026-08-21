# Portfolio — Alemayehu "Alex" Mekonen

Personal site and engineering portfolio, with an AI assistant that answers
questions about the work from structured content.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS v4 ·
Framer Motion · Gemini · Better Auth · Neon Postgres · Vercel

## Changing the content

**You do not need to touch a component to change what the site says.**
Everything lives in [`src/content`](src/content) as JSON — see
[`src/content/README.md`](src/content/README.md) for what each file controls.
Editing those files from the browser is what `/admin/content` does; it saves by
committing, which is explained in [`docs/BLOG.md`](docs/BLOG.md).

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
organisations, technologies, services). Add a role and they update themselves.

## Local development

```bash
yarn install
cp .env.example .env.local   # then fill in the values
yarn dev
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | for the assistant | Server-only. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `EMAIL_USER` / `EMAIL_PASS` | for the contact form | Gmail address + [App Password](https://myaccount.google.com/apppasswords) |
| `DATABASE_URL` | for the blog and sign-in | Neon Postgres. Without it the site is unchanged and `/blog` shows an empty state |
| `BETTER_AUTH_SECRET` | for sign-in | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | for sign-in | Google OAuth client. Free |
| `ADMIN_EMAILS` | for `/admin` | Comma-separated. **Empty means nobody**, including you |
| `GITHUB_TOKEN` / `GITHUB_REPO` | for the content editor | Fine-grained PAT, Contents write, this repo only |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL. Falls back to the Vercel deployment URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | for analytics | Page views, clicks and events. Free at [posthog.com](https://posthog.com) |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | Defaults to PostHog's US cloud; use the EU host if your project is there |

Every one of the blog variables is optional in the sense that matters: with none
of them set the site builds and behaves exactly as it did before the blog
existed. See [`.env.example`](.env.example) for what each absence costs.

These must also be set in **Vercel → Settings → Environment Variables** for the
deployed site. `.env.local` is git-ignored and never leaves your machine.

Without `GEMINI_API_KEY` the site builds and runs normally; the assistant
returns a clear "not configured yet" message instead of failing.

## The blog and admin panel

An X-style feed at `/blog`, with Google sign-in, likes, comments and one level of
replies. `/admin` manages posts, moderates comments, lists readers, and edits the
portfolio content above.

The design and its reasoning — why there are no transactions, why authorization
is expressed as a SQL join, and which of the three admin guards are real — is in
[`docs/BLOG.md`](docs/BLOG.md).

## Architecture

```
src/
  app/           routes — all content pages are statically generated
    api/chat     streaming assistant endpoint (dynamic, never cached)
    api/contact  contact form endpoint (validated, rate limited)
  content/       all editorial content + zod schemas
  components/
    ui/          design primitives — Button, Card, Section, Reveal, …
    layout/      Header, MobileNav, SiteFooter, SkipLink
    home/        home page sections
    projects/    project card
    chat/        assistant UI
    theme/       theme provider and toggle
  lib/
    ai/          provider abstraction — swap point for the model
    rate-limit   shared per-IP limiter
  hooks/         useChat
```

### AI provider

`src/lib/ai/provider.ts` defines a narrow `ChatProvider` interface.
`src/lib/ai/gemini.ts` is the only file that knows the model is Google's.
To move to another provider, add an implementation and change one line in
`src/lib/ai/index.ts`.

The API key is read on the server inside the provider only. It is never
referenced from a client component and is never a `NEXT_PUBLIC_` variable.

The assistant is grounded in the portfolio content: it answers from
`src/content`, may reason across it, and is instructed not to invent
experience. Richer `projects.json` case studies produce better answers.

### Design system

Colour, radius, shadow and font tokens are defined once in
`src/app/globals.css` and exposed to Tailwind via `@theme`. Components use
tokens, never raw hex. Light and dark are both first-class; the theme is
applied before first paint by an inline script, so there is no flash.

Every foreground/background pair is checked against WCAG 2.1 AA.

## Commands

```bash
yarn dev     # development server
yarn build   # production build (also validates content)
yarn start   # serve the production build
yarn lint    # eslint
yarn test    # vitest

yarn db:migrate   # apply src/lib/db/schema.sql (idempotent)
yarn seed:blog    # two example posts (re-runnable)
yarn ingest       # rebuild the assistant's embeddings after a content change
```

## Brand

The identity lives in [`public/brand/`](public/brand/), with the full rationale
in [`public/brand/BRAND_GUIDELINES.md`](public/brand/BRAND_GUIDELINES.md).

The mark is an **A built from two strokes that never touch** — a crossbar
bridges them, and that bridge is the only thing making them a letter. It reads
as a precise geometric A on its own; the Gemini duality is there for anyone who
looks twice.

In code, use the component rather than the files — it inherits `currentColor`,
so one implementation serves both themes:

```tsx
import { AlexLogo } from "@/components/brand/AlexLogo";

<AlexLogo />                     // lockup
<AlexLogo variant="icon" />      // mark only
<AlexLogo variant="wordmark" />  // wordmark only
<AlexLogo animated />            // one-shot mount animation
```

Geometry is generated, not duplicated: `scripts/build-brand.py` writes both the
SVGs in `public/brand/` and `src/components/brand/geometry.ts`, so the assets
and the component cannot drift apart. Don't hand-edit either — change the script
and re-run it:

```bash
pip install fonttools brotli
yarn build                        # emits Inter's woff2 for outline extraction
python3 scripts/build-brand.py    # SVGs + geometry.ts
node scripts/build-brand-png.js   # PNG exports (needs playwright)
```

## Replacing the portrait

`public/portrait.webp` is a background-free cutout, so it sits on whatever
surface the current theme provides and works in light and dark from one asset.

To swap in a new photograph, replace `assets/portrait-source.jpg` and re-run:

```bash
pip install pillow numpy scipy
python3 scripts/build-portrait.py
```

This is a one-off asset tool, not part of `yarn build` — the committed `.webp`
is what the site loads. It expects a studio-style photo on a plain, evenly lit
backdrop; see `scripts/_matte.py` for how the matte is derived and what it
assumes. For a photo shot against a busy background, cut it out by hand instead
and save the result as `public/portrait.webp`.
