# CI/CD

Three separate mechanisms, deliberately kept apart because they run on
different triggers, need different credentials, and fail in different ways.
Confusing any two of them together is the most common way to misdiagnose a
broken pipeline here.

| Mechanism | Where it's defined | What it does | Needs secrets? |
|---|---|---|---|
| Correctness gate | `.github/workflows/ci.yml` | lint, typecheck, test, build, on every push/PR | No |
| Schema migration | `.github/workflows/migrate.yml` | applies `src/lib/db/schema.sql` to production | Yes: `ENV_VAULT_TOKEN` |
| Deploy | Vercel's own GitHub integration (dashboard-configured, not a file in this repo) | builds and deploys the real site | Configured in Vercel, not here |
| Dependency updates | `.github/dependabot.yml` | weekly PRs for outdated packages and Actions | No |

---

## 1. CI: the correctness gate (`ci.yml`)

Runs on every push to `main` and every pull request targeting `main`:

```
checkout → pnpm/action-setup → setup-node (22, pnpm cache)
  → pnpm install --frozen-lockfile
  → pnpm exec eslint .        (lint)
  → pnpm exec tsc --noEmit    (typecheck)
  → pnpm test                 (vitest, no watch)
  → pnpm build                (production build)
```

`concurrency` cancels a still-running run on the same branch/PR the moment a
new push supersedes it, so force-pushing a fixup doesn't queue two redundant
runs.

**No secrets required, on purpose.** `src/lib/blog/service.ts` and every
other database read degrades to an empty result rather than throwing when
`DATABASE_URL` is absent (see `docs/BLOG.md`). The same design that lets a
contributor's laptop run without a database also lets CI build green with
none configured. A CI failure here is a real code problem, never a missing
credential.

This workflow **only proves the code is correct**; it does not deploy
anything. That split is intentional: a gate that also deployed would either
need production secrets on every fork's PR (a real credential-leak surface)
or would deploy code nobody outside the CI runner has approved.

`--frozen-lockfile` is what makes a stray dependency bump *fail* CI instead
of silently reinstalling a different tree than what's committed. If this
step ever fails on locally-passing code, the fix is almost always "you
changed a dependency and forgot to commit the updated `pnpm-lock.yaml`,"
never the flag itself.

## 2. Schema migration (`migrate.yml`)

Triggers only on a push to `main` that touches `src/lib/db/schema.sql`, plus
a manual `workflow_dispatch` for re-running it by hand. Applies the schema to
the **production** database: this is the one workflow in this repo with
real, permanent side effects.

```
checkout → pnpm/action-setup → setup-node → pnpm install --frozen-lockfile
  → install envvault (curl | sh)
  → configure envvault (writes ~/.config/env-vault/config from the
    ENV_VAULT_TOKEN secret)
  → pnpm db:migrate
```

`pnpm db:migrate` is the exact same command a developer runs locally
(`scripts/db-migrate.ts`). CI does not have its own copy of the migration
logic; it just supplies the same `DATABASE_URL` through the same env-vault
that local dev and the deployed app use. Every statement in `schema.sql` is
written to be safe to re-run (see that file's own header), so this workflow
runs on *every* push that touches the schema, not just the first one that
introduced a given statement, without needing to track what has already run.
A merge, a revert, and a hotfix branch all converge to the same correct
schema state with no extra bookkeeping.

The only secret this repo holds for CI is `ENV_VAULT_TOKEN`
(`Settings → Secrets and variables → Actions`, value from the vault
dashboard's Usage panel). `DATABASE_URL` itself is never a GitHub secret: it
is pulled at run time from the vault, the same source local dev and the
deployed app use, so rotating it never means updating a secret here too. If
this workflow fails, it fails loudly rather than skipping. A schema change
that deploys without its migration is exactly the failure this exists to
prevent, so there is no silent fallback path.

`concurrency.cancel-in-progress: false` here, unlike CI, because letting a
second migration run start while the first is still applying is the actual
danger, not redundant work. Queuing (not cancelling) is the safe behavior
for something with real side effects.

## 3. Deploy (Vercel, not a file in this repo)

There is no `deploy.yml`. Vercel's own Git integration watches `main`
directly through its GitHub App and builds/deploys on every push, configured
once in the Vercel dashboard (`Project → Settings → Git`), not as a workflow
committed here. A pull request also gets its own preview deployment
automatically, before merge.

This is why CI and deploy are two separate systems rather than one workflow
with a deploy step at the end. CI's job is "is this code correct," which has
to run identically for every PR, from a fork or not. Deploy's job is "put
this exact commit on Vercel with the real production environment
variables," which only ever makes sense for `main` and needs credentials CI
was deliberately built to run without. Merging a green PR is what triggers
the real deploy; CI passing is a precondition Vercel doesn't itself check,
so don't merge on a red run.

## 4. Dependency updates (`dependabot.yml`)

Weekly, for both the `npm` ecosystem (which covers this pnpm project, see
below) and GitHub Actions versions. Minor and patch bumps across the whole
tree are grouped into one PR; a major bump always gets its own PR, since
that's the kind actually worth reading before merging.

Dependabot's `package-ecosystem: "npm"` is the correct value even though this
repo uses pnpm exclusively. Dependabot uses `"npm"` as the ecosystem
identifier for the whole JS package-manager family, and reads
`pnpm-lock.yaml` correctly once it detects one; it is not a mismatch to fix.

A Dependabot PR runs through the same `ci.yml` gate as any other PR. If it
fails, the fix is the same as for a manually authored dependency bump: read
the failure, patch the break, push to the PR branch. Dependabot PRs are
ordinary branches, not something special-cased.

---

## Putting it together: what actually happens on a normal change

1. Push a branch, open a PR against `main`. `ci.yml` runs; Vercel builds a
   preview deployment from the same commit.
2. A schema change in the PR does **not** touch production yet:
   `migrate.yml` only fires on `main`.
3. Merge the (green) PR. Vercel deploys the merge commit to production.
4. If the merge touched `src/lib/db/schema.sql`, `migrate.yml` fires in
   parallel with the deploy, applying the schema change to the same
   production database the newly deployed code expects.

Because every schema statement is additive/idempotent by convention (see
`schema.sql`'s header), the ordering between "code deployed" and "schema
migrated" landing a few seconds apart is safe either way. Nothing in this
codebase depends on the migration having already run before the new code's
first request.
