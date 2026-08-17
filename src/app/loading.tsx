import React from "react";
import { BrandLoader } from "@/components/brand/BrandLoader";

/**
 * Route-level loading UI, shown while a navigation's payload is in flight.
 *
 * Worth knowing how rarely this is on screen: every content route here is
 * prerendered at build time, so on a fast connection a transition resolves
 * before this can paint. It exists for the slow-network case, and is
 * intentionally not padded with a delay to make itself more visible.
 */
export default function Loading() {
  return <BrandLoader />;
}
