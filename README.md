# Portfolio — Alemayehu "Alex" Mekonen

Personal site and engineering portfolio, with an AI assistant that answers
questions about the work from structured content.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS v4 ·
Framer Motion · Gemini · Vercel

## Changing the content

**You do not need to touch a component to change what the site says.**
Everything lives in [`src/content`](src/content) as JSON — see
[`src/content/README.md`](src/content/README.md) for what each file controls.

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
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL. Falls back to the Vercel deployment URL |

These must also be set in **Vercel → Settings → Environment Variables** for the
deployed site. `.env.local` is git-ignored and never leaves your machine.

Without `GEMINI_API_KEY` the site builds and runs normally; the assistant
returns a clear "not configured yet" message instead of failing.

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
```
