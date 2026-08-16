import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/content";

/**
 * Terminates a sentence without doubling punctuation, so editing the JSON
 * copy to end with a full stop (or not) reads correctly either way.
 */
function sentence(text: string): string {
  return /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

export function ContactCta() {
  return (
    <Section size="lg">
      <Reveal>
        <div className="flex flex-col items-start gap-8 rounded-[var(--radius-xl)] border border-line bg-surface p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
              Have something that needs building?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              {sentence(
                profile.availability.open
                  ? profile.availability.message
                  : "Always happy to talk about interesting systems problems",
              )}{" "}
              The fastest way to reach me is the contact form.
            </p>
          </div>

          <Link href="/contact" className="shrink-0">
            <Button size="lg">
              Get in touch
              <ArrowRight />
            </Button>
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
