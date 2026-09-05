import { getAppBySlug } from "@/content";
import { apkDownloadResponse, guardDownload } from "@/lib/apps/download";
import { fetchApkAsset, getLatestApkAsset } from "@/lib/apps/releases";
import { errorResponse, notFound } from "@/lib/http/guards";

/**
 * Proxies the latest release APK for one app, so a private repo can still
 * offer a direct download: the browser hits this route, never github.com,
 * and the file it gets is always whatever `/releases/latest` resolves to at
 * click time.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function GET(request: Request, { params }: Params) {
  const app = getAppBySlug(params.slug);
  if (!app?.repo) return notFound();

  const guardResponse = guardDownload(request);
  if (guardResponse) return guardResponse;

  try {
    const asset = await getLatestApkAsset(app.repo.name);
    const upstream = await fetchApkAsset(asset);
    return apkDownloadResponse(asset, upstream.body);
  } catch (error) {
    console.error(
      `[apps/download] failed for ${params.slug}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't fetch the latest release from GitHub.");
  }
}
