import React from "react";
import { Hero } from "@/components/home/Hero";
import { CareerFacts } from "@/components/home/CareerFacts";
import { FocusAreas } from "@/components/home/FocusAreas";
import { SelectedWork } from "@/components/home/SelectedWork";
import { RecentWriting } from "@/components/home/RecentWriting";
import { ContactCta } from "@/components/home/ContactCta";

/**
 * Server component. Everything but the writing strip is inlined at build.
 *
 * `RecentWriting` reads from the database, which is why this is now async and
 * carries a revalidate window — but the page is still *statically* rendered, not
 * dynamic. Awaiting a server component does not opt a route out of the static
 * output; only a request-time API like `headers()` or `cookies()` would, which is
 * exactly why the header reads its session on the client instead.
 *
 * Publishing a post revalidates this path directly, so the window below is the
 * backstop rather than the mechanism.
 */

export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <CareerFacts />
      <FocusAreas />
      <SelectedWork />
      <RecentWriting />
      <ContactCta />
    </>
  );
}
