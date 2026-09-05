import "server-only";

/**
 * Fetching the latest release APK for an app whose repo is private.
 *
 * A private repo's release assets return 404 to an anonymous request — the
 * asset URL alone is not enough, even if a visitor has it. So downloads for
 * such an app are proxied through this site: this module authenticates to
 * GitHub with a token, resolves `/releases/latest` (never a pinned tag, so a
 * new release goes live on the next click with no redeploy here), and the API
 * route streams the binary back with the site's own origin — the visitor
 * never sees github.com.
 *
 * The token only needs "Contents: Read-only" on the app repositories it
 * downloads from — never write, never any other repo.
 */

const API = "https://api.github.com";

export class AppReleaseNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`App release downloads are not configured. Missing: ${missing.join(", ")}`);
    this.name = "AppReleaseNotConfiguredError";
  }
}

function read(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function missingAppReleaseVars(): string[] {
  return read("APPS_GITHUB_TOKEN") ? [] : ["APPS_GITHUB_TOKEN"];
}

export function canFetchAppReleases(): boolean {
  return missingAppReleaseVars().length === 0;
}

function token(): string {
  const missing = missingAppReleaseVars();
  if (missing.length > 0) throw new AppReleaseNotConfiguredError(missing);
  return read("APPS_GITHUB_TOKEN")!;
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
    // Never cache: "latest" must mean the release published five minutes ago,
    // not whatever this instance last saw.
    cache: "no-store",
  });
}

export type ReleaseAsset = {
  name: string;
  /** Bytes, as reported by GitHub. */
  size: number;
  /** GitHub API asset URL — accepts `Accept: application/octet-stream` to stream the binary. */
  url: string;
};

type RawAsset = { name: string; size: number; url: string };

type RawRelease = {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: RawAsset[];
};

function findApkAsset(assets: RawAsset[]): ReleaseAsset | undefined {
  return assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
}

/** The `.apk` asset on the newest published (non-draft, non-prerelease) release. */
export async function getLatestApkAsset(repo: string): Promise<ReleaseAsset> {
  const response = await call(`${API}/repos/${repo}/releases/latest`);

  if (response.status === 404) {
    throw new Error(`No published release found for ${repo}`);
  }
  if (!response.ok) {
    throw new Error(`GitHub release lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as { assets: RawAsset[] };

  const apk = findApkAsset(payload.assets);
  if (!apk) {
    throw new Error(`Latest release for ${repo} has no .apk asset`);
  }

  return apk;
}

/** The `.apk` asset on one specific tagged release, published or not. */
export async function getApkAssetForTag(repo: string, tag: string): Promise<ReleaseAsset> {
  const response = await call(`${API}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);

  if (response.status === 404) {
    throw new Error(`No release tagged ${tag} found for ${repo}`);
  }
  if (!response.ok) {
    throw new Error(`GitHub release lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as { assets: RawAsset[] };

  const apk = findApkAsset(payload.assets);
  if (!apk) {
    throw new Error(`Release ${tag} for ${repo} has no .apk asset`);
  }

  return apk;
}

export type ReleaseInfo = {
  /** Git tag, e.g. "v1.2.0". */
  tag: string;
  /** Release title, falling back to the tag when the release has none. */
  name: string;
  /** ISO 8601, or null on the rare release GitHub has not stamped yet. */
  publishedAt: string | null;
  /** Whether this is the release `/releases/latest` (and the plain download route) resolves to. */
  isLatest: boolean;
  asset: ReleaseAsset;
};

/**
 * Every published release with an `.apk` asset, newest first — the ordering
 * GitHub already returns. `isLatest` is computed the same way GitHub computes
 * `/releases/latest` (first non-draft, non-prerelease by creation order)
 * rather than just flagging the first entry here, so it stays correct even if
 * the true latest release happens to have no `.apk` and gets filtered out.
 */
export async function listApkReleases(repo: string): Promise<ReleaseInfo[]> {
  const response = await call(`${API}/repos/${repo}/releases?per_page=30`);

  if (!response.ok) {
    throw new Error(`GitHub release list failed (${response.status})`);
  }

  const releases = (await response.json()) as RawRelease[];
  const published = releases.filter((release) => !release.draft);
  const latestTag = published.find((release) => !release.prerelease)?.tag_name;

  const withAssets: ReleaseInfo[] = [];
  for (const release of published) {
    const asset = findApkAsset(release.assets);
    if (!asset) continue;

    withAssets.push({
      tag: release.tag_name,
      name: release.name || release.tag_name,
      publishedAt: release.published_at,
      isLatest: release.tag_name === latestTag,
      asset,
    });
  }

  return withAssets;
}

/** Streams the asset's binary content, authenticated the same way the lookup was. */
export async function fetchApkAsset(asset: ReleaseAsset): Promise<Response> {
  const response = await call(asset.url, {
    headers: { Accept: "application/octet-stream" },
  });

  if (!response.ok) {
    throw new Error(`GitHub asset download failed (${response.status})`);
  }

  return response;
}
