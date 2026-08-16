import type { MetadataRoute } from "next";
import { getProjectSlugs } from "@/content";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = ["", "/projects", "/about", "/experience", "/contact"].map(
    (path) => ({
      url: absoluteUrl(path || "/"),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
    }),
  );

  const projectRoutes = getProjectSlugs().map((slug) => ({
    url: absoluteUrl(`/projects/${slug}`),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
