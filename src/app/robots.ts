import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // The chat endpoint is dynamic and costs a model call per request.
        "/api/",
        // Not a protection — /admin 404s for everyone but the owner regardless.
        // This is here so well-behaved crawlers do not waste requests on a
        // section that will never serve them anything.
        "/admin",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
