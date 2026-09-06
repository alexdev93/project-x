#!/usr/bin/env node
/**
 * Pushes the env-vault's values for this project into Vercel's real
 * Environment Variables, so the vault stays the one place you actually edit
 * a value while Vercel's own runtime — which has no "start command" to wrap
 * the way a Node server or Docker container does — keeps working exactly as
 * reliably as it does today. A runtime fetch from the vault at cold start
 * was the other option; this repo chose the sync instead, because a vault
 * hiccup would otherwise turn into the whole site failing to boot, unlike
 * every other integration here (DB, LinkedIn, Blob), which degrades a
 * feature and never the page — see src/lib/blog/service.ts's philosophy
 * comment for why that matters.
 *
 * Usage — values only ever flow vault -> child process env/stdin -> Vercel;
 * nothing here is ever printed, logged, or typed anywhere:
 *
 *   envvault run project-x -- node scripts/sync-vercel-env.mjs
 *
 * Needs VERCEL_TOKEN, which is not in the vault by default — create one
 * yourself at https://vercel.com/account/tokens and add it to the vault
 * (key: VERCEL_TOKEN, tagged to project-x) the same way you added
 * GEMINI_API_KEY or LINKEDIN_CLIENT_SECRET. This script never creates or
 * reads that token for you.
 *
 * Both the token and every value are passed to the Vercel CLI without ever
 * touching argv (a `ps` snapshot on this machine, or this script's own error
 * messages, would otherwise leak them): the token rides as an inherited
 * environment variable (Vercel's own documented pattern for CI), and each
 * value is piped to the CLI's stdin, matching the CLI's own
 * `cat file | vercel env add NAME production` example.
 *
 * Re-run this after every value you change in the vault dashboard — nothing
 * pushes automatically, by design (see the tradeoff above).
 */

import { execFileSync } from "node:child_process";

const SCOPE = "afteralexxos-projects";
const PROJECT = "project-x";
const ENVIRONMENTS = "production,preview";

/**
 * Every key the app actually reads (see .env.example) except
 * NEXT_PUBLIC_SITE_URL — Vercel already derives the right value per
 * environment from its own VERCEL_PROJECT_PRODUCTION_URL (see
 * src/lib/site.ts), and forcing the vault's static production domain onto
 * every environment would break that for preview deployments.
 */
const KEYS = [
  "GEMINI_API_KEY",
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "BLOB_WEBHOOK_PUBLIC_KEY",
  "ADMIN_EMAILS",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
  "GITHUB_BRANCH",
  "APPS_GITHUB_TOKEN",
  "EMAIL_USER",
  "EMAIL_PASS",
  "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

/** VERCEL_TOKEN rides in `env`, inherited by the child — never in argv. */
function vercel(args, { input = "" } = {}) {
  return execFileSync("npx", ["--yes", "vercel@latest", ...args], {
    env: process.env,
    input,
    encoding: "utf8",
  });
}

function main() {
  if (!process.env.VERCEL_TOKEN) {
    console.error(
      "VERCEL_TOKEN is not set.\n" +
        "Create one at https://vercel.com/account/tokens and add it to the " +
        "vault (key: VERCEL_TOKEN, tagged to project-x), then re-run this " +
        "through `envvault run project-x -- ...`.",
    );
    process.exit(1);
  }

  // Establishes .vercel/project.json (gitignored) so every later `env add`
  // resolves the right project without repeating --project/--scope.
  vercel(["link", "--yes", "--project", PROJECT, "--scope", SCOPE]);

  let failed = 0;
  for (const key of KEYS) {
    const value = process.env[key];
    if (!value) {
      console.log(`  skip   ${key} (not set in the vault)`);
      continue;
    }

    try {
      vercel(["env", "add", key, ENVIRONMENTS, "--force", "--yes"], { input: value });
      console.log(`  ok     ${key}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAILED ${key}: ${error.message.split("\n")[0]}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} variable(s) failed to sync.`);
    process.exit(1);
  }
  console.log(`\nSynced ${KEYS.length} variable(s) to Vercel (${ENVIRONMENTS}).`);
}

main();
