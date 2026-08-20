import React from "react";
import { Download, Lock } from "lucide-react";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { App } from "@/content";

/**
 * Unlike ProjectCard, this is not a stretched-link card — there is no detail
 * page per app, so the download button (when there is somewhere to send
 * visitors) is the only interactive element.
 */

const platformLabel: Record<App["platform"], string> = {
  android: "Android",
};

export function AppCard({ app }: { app: App }) {
  return (
    <Card className="flex flex-col">
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
              {app.name}
            </h3>
          </div>
        </div>

        <p className="flex-1 text-sm leading-relaxed text-ink-muted">
          {app.tagline}
        </p>

        <TechTagList items={app.tech} />

        <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {app.downloadUrl ? (
            <ButtonLink
              href={app.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              <Download aria-hidden />
              Download {app.platform === "android" ? "APK" : ""}
            </ButtonLink>
          ) : (
            <span className="text-sm text-ink-subtle">Download coming soon</span>
          )}
          {app.version ? (
            <span className="font-mono text-xs text-ink-subtle">v{app.version}</span>
          ) : null}
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
