import type { MetadataRoute } from "next";
import { getProjectSlugs } from "@/content";
import { absoluteUrl } from "@/lib/site";
import { getPublishedSlugs } from "@/lib/blog/service";

/**
 * The sitemap, now that some of it lives in a database.
 *
 * Revalidated hourly. Post URLs come from the same published-only query the feed
 * uses, so a draft can never appear here — and if that read fails, the blog
 * section is simply omitted rather than taking the whole sitemap down with it.
 * A sitemap missing a section is a minor problem; a sitemap returning 500 is a
 * crawling one.
 *
 * `staticRoutes` is hand-maintained, and so is the path list in
 * src/lib/blog/invalidate.ts. Those two drifting apart is the predictable
 * failure here, so a new route should be added to both in the same commit.
 */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes = [
    "",
    "/projects",
    "/blog",
    "/about",
    "/experience",
    "/ai",
    "/contact",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const projectRoutes = getProjectSlugs().map((slug) => ({
    url: absoluteUrl(`/projects/${slug}`),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const postRoutes = (await getPublishedSlugs()).map(({ slug, publishedAt }) => ({
    url: absoluteUrl(`/blog/${slug}`),
    // The publication date, not now: a crawler uses this to decide whether to
    // refetch, and claiming every post changed today wastes its time and ours.
    lastModified: publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes, ...postRoutes];
}
