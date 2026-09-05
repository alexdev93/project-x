import "server-only";
import { errorResponse } from "@/lib/http/guards";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { canFetchAppReleases, type ReleaseAsset } from "./releases";

/**
 * The parts of an APK download route that don't depend on *which* release was
 * asked for — shared by the "latest" and per-tag routes so the two differ only
 * in how they look the asset up.
 */

// A real visitor downloads once, maybe retries; this only needs to blunt
// something scripting requests against a private repo's assets through here.
const DOWNLOAD_LIMIT = { limit: 20, windowMs: 5 * 60_000 };

/** Rate limit + configuration check. Returns a response to short-circuit with, or null to proceed. */
export function guardDownload(request: Request): Response | null {
  const limit = rateLimit(clientKey(request, "app-download"), DOWNLOAD_LIMIT);
  if (!limit.allowed) {
    return errorResponse(429, "Too many requests.", {}, limit.retryAfterSeconds);
  }

  if (!canFetchAppReleases()) {
    console.error("[apps/download] APPS_GITHUB_TOKEN is not configured.");
    return errorResponse(503, "Downloads aren't configured right now.");
  }

  return null;
}

/** Streams the asset back with the site's own origin, never github.com. */
export function apkDownloadResponse(
  asset: ReleaseAsset,
  body: ReadableStream<Uint8Array> | null,
): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="${asset.name}"`,
      "Content-Length": String(asset.size),
      "Cache-Control": "no-store",
    },
  });
}
