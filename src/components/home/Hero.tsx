import React from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PortraitLineArt } from "@/components/portrait/PortraitLineArt";
import { profile } from "@/content";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* A single soft wash anchored behind the portrait. Deliberately the
          only decorative gradient on the site. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-20%] top-[-30%] hidden h-[640px] w-[640px] rounded-full bg-accent-soft opacity-60 blur-3xl lg:block"
      />

      <Container width="wide" className="relative">
        <div className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                {profile.availability.open ? (
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full bg-accent"
                  />
                ) : null}
                {profile.availability.message}
              </p>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl">
                {profile.displayName}
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-4 text-lg text-ink-muted sm:text-xl">
                {profile.role}
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-ink sm:text-xl">
                {profile.tagline}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/projects">
                  <Button size="lg">
                    View selected work
                    <ArrowRight />
                  </Button>
                </Link>

                <ButtonLink
                  href={profile.resume.href}
                  download
                  variant="secondary"
                  size="lg"
                >
                  <Download />
                  {profile.resume.label}
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.1} direction="none">
              {/* Line art rather than the photograph: pure currentColor ink,
                  so it is correct in both themes with no separate dark-mode
                  asset. Temporary by design — swap for a proper photo whenever
                  one exists; the panel and animation contract stay the same. */}
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface-raised p-6 text-ink sm:p-8 lg:max-w-none">
                <PortraitLineArt
                  className="h-full w-full"
                  label={`Line-art portrait of ${profile.name}`}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
