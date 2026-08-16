import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { profile } from "@/content";
import { navItems } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container width="wide" as="div">
        <div className="flex flex-col gap-10 py-14 sm:py-16">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="max-w-sm">
              <p className="font-display text-2xl text-ink">{profile.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {profile.tagline}
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                {profile.location}
              </p>
            </div>

            <nav aria-label="Footer">
              <ul className="flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex flex-col-reverse gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-subtle">
              © {new Date().getFullYear()} {profile.name}
            </p>

            <ul className="flex items-center gap-1">
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
                    className="flex size-10 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
                  >
                    <SocialIcon platform={social.platform} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}
