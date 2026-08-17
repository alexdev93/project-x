/**
 * Loads local environment for the standalone scripts.
 *
 * Next injects .env.local automatically, but `tsx scripts/…` runs outside that,
 * so `yarn db:migrate` and `yarn ingest` would otherwise see no DATABASE_URL or
 * GEMINI_API_KEY. Import this first, before anything that reads process.env.
 *
 * Real environment variables win, so CI and Vercel are unaffected.
 */

import { config } from "dotenv";

// .env.local first: it is the developer's override and takes precedence.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
