import React from "react";
import { Hero } from "@/components/home/Hero";
import { CareerFacts } from "@/components/home/CareerFacts";
import { FocusAreas } from "@/components/home/FocusAreas";
import { SelectedWork } from "@/components/home/SelectedWork";
import { ContactCta } from "@/components/home/ContactCta";

/** Server component — content is inlined at build, nothing fetches at runtime. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CareerFacts />
      <FocusAreas />
      <SelectedWork />
      <ContactCta />
    </>
  );
}
