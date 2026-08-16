import React from "react";
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "@/components/contact/ContactForm";
import { profile } from "@/content";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${profile.name} — ${profile.role} based in ${profile.location}.`,
};

const details = [
  { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  {
    icon: Phone,
    label: "Phone",
    value: profile.phone,
    href: `tel:${profile.phone.replace(/\s/g, "")}`,
  },
  { icon: MapPin, label: "Location", value: profile.location, href: null },
];

export default function ContactPage() {
  return (
    <Section width="wide" size="lg">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
              Contact
            </p>
            <h1 className="mt-6 font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
              Get in touch
            </h1>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ink-muted sm:text-lg">
              Whether it&apos;s a role, a system that needs untangling, or a
              question about something on this site — send a message and
              I&apos;ll get back to you.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <dl className="mt-10 space-y-5 border-t border-line pt-8">
              {details.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3.5">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  <div>
                    <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-ink">
                      {href ? (
                        <a href={href} className="transition-colors hover:text-accent">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="mt-8 flex items-center gap-1">
              {profile.socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      social.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex size-10 items-center justify-center rounded-[var(--radius)] border border-line text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink"
                  >
                    <SocialIcon platform={social.platform} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={0.05}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
