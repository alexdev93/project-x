"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useSession } from "@/lib/auth/client";
import { getPostHogHost, getPostHogToken } from "@/lib/analytics/config";

/**
 * Page-view, click and event tracking (PostHog), with country and
 * device/browser breakdowns computed by PostHog itself from the request IP
 * and user agent — nothing to build for those two here.
 *
 * Renders nothing and affects nothing about how a page is rendered: no
 * `headers()`, no `cookies()`, no server involvement at all. Every page stays
 * exactly as static as it already was; this only ever runs in the browser,
 * after the fact.
 *
 * `capture_pageview: false` at init, with pageviews sent by hand on every
 * pathname/query change instead — PostHog's automatic pageview capture
 * assumes a full page load per navigation, which the App Router does not do.
 * Click, form-submit and other interaction tracking stays on PostHog's
 * default autocapture; there is nothing App-Router-specific about those.
 */

let initialized = false;

function initPostHog() {
  if (initialized) return;
  const token = getPostHogToken();
  if (!token) return;

  posthog.init(token, {
    api_host: getPostHogHost(),
    // Opts into PostHog's dated defaults preset rather than leaving every
    // individual behaviour to this library's own hardcoded fallbacks — the
    // date pins which preset, so a future posthog-js upgrade cannot silently
    // change this site's tracking behaviour out from under it. (Missing from
    // this version's shipped .d.ts, confirmed handled at runtime by reading
    // the compiled bundle directly — `config.defaults` feeds a resolver and
    // is echoed back as `$config_defaults` on every captured event.)
    defaults: "2026-05-30",
    // A person profile costs quota; a visitor who never signs in and is
    // never `identify()`-d does not need one to show up in pageview, click
    // and country/device breakdowns.
    person_profiles: "identified_only",
    // Honours the browser's Do Not Track setting rather than overriding it.
    respect_dnt: true,
    // Overrides whatever the dated preset above assumes: the App Router
    // never does a full page load on navigation, so PostHog's own automatic
    // pageview capture would miss every client-side route change. Pageviews
    // are sent by hand in PageViewTracker below instead.
    capture_pageview: false,
  });
  initialized = true;
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const isAdmin =
    session?.user &&
    "isAdmin" in session.user &&
    session.user.isAdmin === true;

  useEffect(() => {
    if (!initialized) return;

    // The owner's own visits — testing a post, checking the admin panel —
    // are not visitor traffic and would only skew "who visits, what they
    // click" toward the one person who already knows the site.
    if (isAdmin) {
      posthog.opt_out_capturing();
      return;
    }
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();

    const query = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams, isAdmin]);

  return null;
}

export function PostHogProvider() {
  useEffect(() => {
    initPostHog();
  }, []);

  if (!getPostHogToken()) return null;

  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
