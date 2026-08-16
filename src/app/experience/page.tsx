import React from "react";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { experiences, formatDateRange, type Experience } from "@/content";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Roles across banking, telecom and product engineering — backend services, platform work and full-stack delivery.",
};

const kindLabels: Record<Experience["kind"], string> = {
  employment: "Full-time",
  internship: "Internship",
  training: "Programme",
  freelance: "Freelance",
};

export default function ExperiencePage() {
  return (
    <Section size="lg">
      <SectionHeader
        as="h1"
        eyebrow="Experience"
        title="Where I've worked"
        description="Roles in reverse order. Current positions are listed first."
      />

      <Stagger className="mt-16">
        <ol className="relative">
          {experiences.map((entry) => (
            <StaggerItem key={entry.id} as="li">
              {/* The rule is drawn on the list item rather than as a single
                  absolute line, so it never outruns the last entry. */}
              <div className="relative grid gap-6 border-l border-line pb-12 pl-8 last:border-transparent last:pb-0 lg:grid-cols-12 lg:gap-10">
                <span
                  aria-hidden
                  className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-canvas bg-accent"
                />

                <div className="lg:col-span-4">
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                    {formatDateRange(entry)}
                  </p>
                  <p className="mt-3 font-display text-xl text-ink">
                    {entry.company}
                  </p>
                  {entry.location ? (
                    <p className="mt-1 text-sm text-ink-subtle">
                      {entry.location}
                    </p>
                  ) : null}
                  <Badge tone="quiet" className="mt-3">
                    {kindLabels[entry.kind]}
                  </Badge>
                </div>

                <div className="lg:col-span-8">
                  <h2 className="text-lg font-medium text-ink">{entry.title}</h2>
                  <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-ink-muted">
                    {entry.summary}
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {entry.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="relative max-w-[68ch] pl-5 text-sm leading-relaxed text-ink-muted before:absolute before:left-0 before:top-[0.6em] before:size-1 before:rounded-full before:bg-ink-subtle"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <TechTagList items={entry.tech} className="mt-6" />
                </div>
              </div>
            </StaggerItem>
          ))}
        </ol>
      </Stagger>
    </Section>
  );
}
