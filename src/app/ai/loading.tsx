import React from "react";
import { BrandLoader } from "@/components/brand/BrandLoader";

/**
 * Loading UI for the assistant.
 *
 * Scoped to this route rather than sitting at the app root, and the reason is a
 * measured defect rather than tidiness. A `loading.tsx` opens a Suspense
 * boundary, which makes the response *stream* — so the HTTP status is committed
 * before rendering finishes, and a later `notFound()` can no longer set it. With
 * the boundary at the root, every unknown URL under a dynamic route
 * (/blog/[slug], /blog/page/[n], /projects/[slug]) answered **200 with this
 * loading page** instead of 404. A crawler would have indexed "Loading" for
 * every bad link.
 *
 * /ai is the right place to keep it: it has no dynamic parameters, so it has no
 * not-found case to break, and at 213 kB it is far and away the heaviest page on
 * the site — the one where a visitor on a slow connection actually waits.
 *
 * Deliberately not a timed splash. It appears only while something is genuinely
 * pending.
 */
export default function Loading() {
  return <BrandLoader message="Waking the assistant" />;
}
