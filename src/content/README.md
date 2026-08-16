# Content

Everything the site says lives in this folder. **You never need to touch a
component to change copy.** Edit a `.json` file, commit, push — Vercel rebuilds.

| File | Controls |
|---|---|
| `profile.json` | Name, role, tagline, bio, focus areas, contact details, CV link, social links |
| `experience.json` | The work timeline |
| `projects.json` | Project cards and case-study pages |
| `skills.json` | Tech stack, grouped |
| `education.json` | Degrees, programmes, certifications |
| `ai.json` | AI assistant greeting, suggested prompts, and behaviour rules |

`schema.ts` defines the allowed shape of each file. `index.ts` loads and
validates them.

## Validation

Content is checked against the schema **at build time**. If a required field is
missing or a value is the wrong type, `yarn build` fails with the exact path:

```
Invalid content in src/content/projects.json:
  • 1.tech: Array must contain at least 1 element(s)
```

That is deliberate — it means a typo shows up in the build log rather than as a
blank section on the live site.

## Conventions

- **Dates** are `YYYY-MM` (e.g. `"2024-03"`). Use `null` for `end` when a role
  is current.
- **Slugs** are kebab-case and become URLs: `"zemenawi-crm"` →
  `/projects/zemenawi-crm`. Changing a slug changes the URL.
- **Empty strings are meaningful.** In `projects.json`, a narrative field left
  as `""` is skipped entirely by the UI. An unwritten case study renders as a
  clean summary page rather than a heading with nothing under it.

## Filling in the case studies

`projects.json` was seeded from your GitHub repositories, so the factual fields
(name, stack, visibility, components) are populated. These five fields per
project are **still empty and are the highest-value thing you can add**:

- `problem` — what needed solving, and what made it non-trivial
- `approach` — what you built and why that shape
- `architecture` — how the pieces fit; name the boundaries
- `outcome` — what changed as a result
- `decisions[]` — `{ title, detail }` for choices worth defending

The AI assistant answers from exactly this data. Filling these in is what turns
"he has microservices experience" into a specific, credible answer.

## Adding a project

Append an object to `projects.json`. Required: `slug`, `name`, `summary`,
`category`, `year`, `role`, `tech`. Everything else has a default.

- `category` — one of `distributed-systems`, `backend`, `full-stack`, `ai`,
  `infrastructure`
- `weight` — higher sorts first
- `featured: true` — also shows on the home page
- `repo.visibility` — `"private"` renders a lock badge; `"public"` requires
  `repo.href` and renders a link

## Numbers on the About section

The stat figures are **computed** from `experience.json` and `projects.json`
(see `getCareerFacts` in `index.ts`) — years, organisations, technologies,
services. Add a role and they update themselves. Nothing is hardcoded, so
nothing goes stale.
