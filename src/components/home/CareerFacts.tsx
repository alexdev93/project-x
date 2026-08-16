import React from "react";
import { Container } from "@/components/ui/Container";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { getCareerFacts } from "@/content";

/**
 * Figures are derived from experience.json and projects.json rather than
 * written by hand, so they cannot drift out of date as content is added.
 */
export function CareerFacts() {
  const facts = getCareerFacts();

  return (
    <section className="border-y border-line bg-surface-raised/50">
      <Container width="wide">
        <Stagger className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 lg:grid-cols-4">
          {facts.map((fact) => (
            <StaggerItem key={fact.label}>
              <p className="font-display text-4xl tabular-nums text-ink sm:text-5xl">
                {fact.value}
              </p>
              <p className="mt-2 text-sm leading-snug text-ink-muted">
                {fact.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
