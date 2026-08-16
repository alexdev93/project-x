import React from "react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { profile } from "@/content";

export function FocusAreas() {
  return (
    <Section width="wide" size="lg">
      <SectionHeader
        eyebrow="What I do"
        title="Four areas, one system"
        description="Most of my work sits where backend, infrastructure and delivery meet — the parts of a system that are expensive to change once they're wrong."
      />

      <Stagger className="mt-14 grid gap-4 sm:grid-cols-2">
        {profile.focusAreas.map((area, index) => (
          <StaggerItem key={area.title}>
            <Card className="h-full p-6 sm:p-8">
              <span
                aria-hidden
                className="font-mono text-xs tabular-nums text-ink-subtle"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-2xl text-ink">
                {area.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {area.description}
              </p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
