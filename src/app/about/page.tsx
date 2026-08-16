import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { education, profile, skillGroups, type SkillDepth } from "@/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description: profile.bio[0],
};

/**
 * Depth bands rather than a percentage. "core" is what he reaches for daily,
 * "working" is shipped-with, "familiar" is used but not owned.
 */
const depthStyles: Record<SkillDepth, string> = {
  core: "border-accent/30 bg-accent-soft text-accent",
  working: "border-line bg-surface-raised text-ink-muted",
  familiar: "border-line bg-transparent text-ink-subtle",
};

const depthLabels: Record<SkillDepth, string> = {
  core: "Core",
  working: "Working",
  familiar: "Familiar",
};

export default function AboutPage() {
  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                About
              </p>
              <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-[-0.01em] text-ink sm:text-6xl">
                {profile.name}
              </h1>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mt-8 max-w-[68ch] space-y-5 text-base leading-relaxed text-ink-muted sm:text-lg">
                {profile.bio.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <ButtonLink
                href={profile.resume.href}
                download
                variant="secondary"
                className="mt-10"
              >
                <Download />
                {profile.resume.label}
              </ButtonLink>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.05} direction="none">
              <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] border border-line bg-gradient-to-b from-portrait-from to-portrait-to">
                <Image
                  src={profile.avatar}
                  alt={`Portrait of ${profile.name}`}
                  fill
                  sizes="(max-width: 1024px) 384px, 33vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </Container>

      <Section size="lg" className="border-t border-line">
        <SectionHeader
          eyebrow="Stack"
          title="What I build with"
          description="Grouped by what the tool is for, and how deep the experience actually goes."
        />

        <Stagger className="mt-14 space-y-10">
          {skillGroups.map((group) => (
            <StaggerItem key={group.id}>
              <div className="grid gap-5 border-t border-line pt-8 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-4">
                  <h3 className="font-display text-2xl text-ink">
                    {group.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {group.description}
                  </p>
                </div>

                <ul className="flex flex-wrap gap-2 lg:col-span-8">
                  {group.skills.map((skill) => (
                    <li key={skill.name}>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm",
                          depthStyles[skill.depth],
                        )}
                      >
                        {skill.name}
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-70">
                          {depthLabels[skill.depth]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section size="lg" className="border-t border-line">
        <SectionHeader eyebrow="Education" title="Training and credentials" />

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-2">
          {education.map((entry) => (
            <StaggerItem key={entry.id} className="h-full">
              <Card className="h-full p-6">
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                  {entry.year}
                </p>
                <h3 className="mt-3 font-display text-xl text-ink">
                  {entry.institution}
                </h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  {entry.credential}
                </p>
                {entry.detail ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-subtle">
                    {entry.detail}
                  </p>
                ) : null}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
