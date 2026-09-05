import React from "react";
import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { App } from "@/content";

/**
 * Stretched-link card like ProjectCard: the whole card, including the button,
 * leads to the app's detail page rather than downloading anything directly.
 *
 * That's deliberate, not just simplicity: this card is rendered on a
 * statically-built page, so any version text here would be whatever
 * `apps.json` says at build time — which is exactly the mismatch this design
 * replaced (a stale "v1.0.0" next to a button that actually fetched
 * whatever's newest on GitHub). The detail page fetches live, so it's the
 * only place a version number is shown, and routing the button there first
 * also means a visitor sees the privacy policy before installing something
 * that reads their SMS.
 */

const platformLabel: Record<App["platform"], string> = {
  android: "Android",
};

export function AppCard({ app }: { app: App }) {
  return (
    <Card interactive className="relative flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-4">
        <div className="flex items-start gap-4">
          <AppIcon app={app} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone="accent">{platformLabel[app.platform]}</Badge>
              {app.repo?.visibility === "private" ? (
                <Badge tone="quiet">
                  <Lock aria-hidden />
                  Private
                </Badge>
              ) : null}
            </div>

            <h3 className="mt-2 font-display text-xl leading-tight text-ink">
              <Link href={`/apps/${app.slug}`} className="after:absolute after:inset-0">
                {app.name}
              </Link>
            </h3>
          </div>
        </div>

        <p className="flex-1 text-sm leading-relaxed text-ink-muted">
          {app.tagline}
        </p>

        <TechTagList items={app.tech} />

        <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {app.downloadUrl ? (
            // relative z-10: sits above the card's own stretched link so it
            // stays its own click target, even though both currently point
            // at the same place.
            <ButtonLink href={`/apps/${app.slug}`} size="sm" className="relative z-10">
              <Download aria-hidden />
              View & download
            </ButtonLink>
          ) : (
            <span className="text-sm text-ink-subtle">Download coming soon</span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function AppIcon({ app }: { app: App }) {
  if (app.icon) {
    return (
      // A local, hand-authored asset under /public — next/image's optimizer
      // would add nothing at this fixed 48px size and a fixed set of icons.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={app.icon}
        alt=""
        aria-hidden
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-[var(--radius)]"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line bg-surface-raised font-display text-lg text-ink-muted"
    >
      {app.name.trim().charAt(0).toLocaleUpperCase()}
    </span>
  );
}
