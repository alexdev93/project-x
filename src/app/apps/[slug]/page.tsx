import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { DownloadButton } from "@/components/apps/DownloadButton";
import { Chapter } from "@/components/projects/Chapter";
import { apps, getAppBySlug, hasAppCaseStudy, type App } from "@/content";
import { canFetchAppReleases, listApkReleases, type ReleaseInfo } from "@/lib/apps/releases";
import { formatDate } from "@/lib/format";

// The versions list is a live GitHub API call, not build-time content, so
// this page can't be statically generated the way /projects/[slug] is.
export const dynamic = "force-dynamic";

const platformLabel: Record<App["platform"], string> = {
  android: "Android",
};

type Params = { params: { slug: string } };

export function generateMetadata({ params }: Params): Metadata {
  const app = getAppBySlug(params.slug);
  if (!app) return {};

  return {
    title: app.name,
    description: app.tagline,
    openGraph: { title: app.name, description: app.tagline },
  };
}

/** "24.3 MB". GitHub reports asset size in bytes. */
function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tags already read "v1.2.0"; the static content field is bare "1.2.0". */
function formatVersionLabel(value: string): string {
  return value.startsWith("v") ? value : `v${value}`;
}

type VersionsState =
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "ready"; releases: ReleaseInfo[] };

async function loadVersions(repoName: string): Promise<VersionsState> {
  if (!canFetchAppReleases()) return { status: "unavailable" };

  try {
    return { status: "ready", releases: await listApkReleases(repoName) };
  } catch (error) {
    console.error(`[apps/${repoName}] failed to list releases:`, error);
    return { status: "error" };
  }
}

export default function AppPage({ params }: Params) {
  const app = getAppBySlug(params.slug);
  if (!app) notFound();

  const others = apps.filter((item) => item.slug !== app.slug).slice(0, 2);

  return (
    <article className="py-14 sm:py-20">
      <Container>
        <Link
          href="/projects"
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          All projects
        </Link>

        <header className="mt-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{platformLabel[app.platform]}</Badge>
            {app.repo?.visibility === "private" ? (
              <Badge tone="quiet">
                <Lock aria-hidden />
                Private repository
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-[-0.01em] text-ink sm:text-6xl">
            {app.name}
          </h1>

          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-muted sm:text-xl">
            {app.tagline}
          </p>

          {app.description ? (
            <div className="mt-6 max-w-[62ch] space-y-4 text-base leading-relaxed text-ink-muted">
              {app.description.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {/* Single column below sm: a repo name plus its external-link icon
              wraps mid-link in a ~148px grid-cols-2 column, splitting the icon
              from its text — stacking reads better than that at any length. */}
          <dl className="mt-10 grid grid-cols-1 gap-6 border-y border-line py-6 sm:grid-cols-3">
            {app.repo ? (
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                  Source
                </dt>
                <dd className="mt-1.5 text-sm">
                  {app.repo.visibility === "public" && app.repo.href ? (
                    <a
                      href={app.repo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent hover:underline"
                    >
                      {app.repo.name}
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  ) : (
                    <span className="text-ink-subtle">Not public</span>
                  )}
                </dd>
              </div>
            ) : null}
            {app.privacyUrl ? (
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                  Privacy
                </dt>
                <dd className="mt-1.5 text-sm">
                  <a
                    href={app.privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-accent hover:underline"
                  >
                    Privacy policy
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          <TechTagList items={app.tech} className="mt-8" />
        </header>

        <div className="mt-14 space-y-12">
          {app.downloadUrl ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <Suspense fallback={<BrandLoader compact message="Checking the latest release" />}>
                <DownloadSection app={app} downloadUrl={app.downloadUrl} />
              </Suspense>
            </Reveal>
          ) : null}

          <Chapter title="The problem" body={app.problem} />
          <Chapter title="Approach" body={app.approach} />
          <Chapter title="Architecture" body={app.architecture} />

          {app.components.length > 0 ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                Components
              </h2>
              <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
                {app.components.map((component) => (
                  <StaggerItem key={component.name} className="h-full">
                    <Card className="h-full p-5">
                      <p className="font-mono text-sm text-accent">
                        {component.name}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {component.description}
                      </p>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </Reveal>
          ) : null}

          {app.decisions.length > 0 ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                Decisions
              </h2>
              <dl className="mt-6 space-y-6">
                {app.decisions.map((decision) => (
                  <div key={decision.title}>
                    <dt className="font-display text-xl text-ink">
                      {decision.title}
                    </dt>
                    <dd className="mt-2 max-w-[68ch] text-base leading-relaxed text-ink-muted">
                      {decision.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ) : null}

          <Chapter title="Outcome" body={app.outcome} />
          <Chapter title="Guide" body={app.guide} />

          {!hasAppCaseStudy(app) ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <p className="max-w-[62ch] text-base leading-relaxed text-ink-subtle">
                A full write-up of this app is still to come. In the
                meantime, the stack and structure above give the shape of it,
                and the assistant can answer questions about the work.
              </p>
            </Reveal>
          ) : null}
        </div>

        {others.length > 0 ? (
          <nav aria-label="More apps" className="mt-20 border-t border-line pt-10">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
              More apps
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/apps/${other.slug}`}
                    className="block rounded-lg border border-line p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
                  >
                    <p className="font-display text-xl text-ink">{other.name}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">
                      {other.tagline}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </Container>
    </article>
  );
}

/**
 * The live part of the page: current version, the latest-APK button, and the
 * full version history — all one GitHub fetch, streamed in behind the
 * Suspense boundary above rather than blocking the rest of the page on it.
 */
async function DownloadSection({ app, downloadUrl }: { app: App; downloadUrl: string }) {
  const versions = app.repo ? await loadVersions(app.repo.name) : null;
  const latest = versions?.status === "ready" ? versions.releases.find((r) => r.isLatest) : undefined;
  const currentVersion = latest?.tag ?? app.version;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
            Download
          </h2>
          {currentVersion ? (
            <p className="mt-1.5 font-mono text-sm text-ink">
              Current version {formatVersionLabel(currentVersion)}
            </p>
          ) : null}
        </div>
        <DownloadButton href={downloadUrl} size="sm">
          <Download aria-hidden />
          Download latest {app.platform === "android" ? "APK" : ""}
        </DownloadButton>
      </div>

      <div className="mt-6">
        <VersionsList versions={versions} slug={app.slug} />
      </div>
    </>
  );
}

function VersionsList({
  versions,
  slug,
}: {
  versions: VersionsState | null;
  slug: string;
}) {
  if (!versions || versions.status === "unavailable") {
    return (
      <p className="text-sm text-ink-subtle">Downloads aren&apos;t configured right now.</p>
    );
  }

  if (versions.status === "error") {
    return (
      <p className="text-sm text-ink-subtle">
        Couldn&apos;t load the version history from GitHub right now.
      </p>
    );
  }

  if (versions.releases.length === 0) {
    return <p className="text-sm text-ink-subtle">No published releases yet.</p>;
  }

  return (
    <Stagger className="grid gap-3 sm:grid-cols-2">
      {versions.releases.map((release) => (
        <StaggerItem key={release.tag} className="h-full">
          <Card className="flex h-full items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-sm text-ink">{release.name}</p>
                {release.isLatest ? (
                  <Badge tone="accent">
                    <ShieldCheck aria-hidden />
                    Latest
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                {release.publishedAt ? formatDate(new Date(release.publishedAt)) : "Unpublished"}
                {" · "}
                {formatSize(release.asset.size)}
              </p>
            </div>

            <DownloadButton
              href={`/api/apps/${slug}/download/${encodeURIComponent(release.tag)}`}
              variant="secondary"
              size="sm"
              className="shrink-0"
            >
              <Download aria-hidden />
              Download
            </DownloadButton>
          </Card>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
