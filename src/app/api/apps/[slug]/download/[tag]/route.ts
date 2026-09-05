import { getAppBySlug } from "@/content";
import { apkDownloadResponse, guardDownload } from "@/lib/apps/download";
import { fetchApkAsset, getApkAssetForTag } from "@/lib/apps/releases";
import { errorResponse, notFound } from "@/lib/http/guards";

/**
 * Proxies one specific tagged release's APK — the counterpart to the
 * `download` route's "always whatever is newest" for the versions list on an
 * app's detail page, where a visitor picks an older build on purpose.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { slug: string; tag: string } };

export async function GET(request: Request, { params }: Params) {
  const app = getAppBySlug(params.slug);
  if (!app?.repo) return notFound();

  const guardResponse = guardDownload(request);
  if (guardResponse) return guardResponse;

  try {
    const asset = await getApkAssetForTag(app.repo.name, params.tag);
    const upstream = await fetchApkAsset(asset);
    return apkDownloadResponse(asset, upstream.body);
  } catch (error) {
    console.error(
      `[apps/download] failed for ${params.slug}@${params.tag}:`,
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't fetch that release from GitHub.");
  }
}
