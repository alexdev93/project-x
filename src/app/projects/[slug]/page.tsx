import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import {
  getProjectBySlug,
  getProjectSlugs,
  hasCaseStudy,
  projectCategoryLabel,
  projects,
} from "@/content";

type Params = { params: { slug: string } };

/** Pre-renders every project at build time. */
export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const project = getProjectBySlug(params.slug);
  if (!project) return {};

  return {
    title: project.name,
    description: project.summary,
    openGraph: { title: project.name, description: project.summary },
  };
}

/** A titled block of case-study prose. Renders nothing when unwritten. */
function Chapter({ title, body }: { title: string; body: string }) {
  if (!body) return null;

  return (
    <Reveal as="section" className="border-t border-line pt-10">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
        {title}
      </h2>
      <div className="mt-5 max-w-[68ch] space-y-4 text-base leading-relaxed text-ink-muted sm:text-lg">
        {body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </Reveal>
  );
}

export default function ProjectPage({ params }: Params) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const others = projects.filter((item) => item.slug !== project.slug).slice(0, 2);

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
            <Badge tone="accent">
              {projectCategoryLabel(project.category)}
            </Badge>
            {project.repo?.visibility === "private" ? (
              <Badge tone="quiet">
                <Lock aria-hidden />
                Private repository
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-[-0.01em] text-ink sm:text-6xl">
            {project.name}
          </h1>

          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-muted sm:text-xl">
            {project.summary}
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                Year
              </dt>
              <dd className="mt-1.5 text-sm text-ink">{project.year}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                Role
              </dt>
              <dd className="mt-1.5 text-sm text-ink">{project.role}</dd>
            </div>
            {project.repo ? (
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
                  Source
                </dt>
                <dd className="mt-1.5 text-sm">
                  {project.repo.visibility === "public" && project.repo.href ? (
                    <a
                      href={project.repo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent hover:underline"
                    >
                      {project.repo.name}
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  ) : (
                    <span className="text-ink-subtle">Not public</span>
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          <TechTagList items={project.tech} className="mt-8" />
        </header>

        <div className="mt-14 space-y-12">
          <Chapter title="The problem" body={project.problem} />
          <Chapter title="Approach" body={project.approach} />
          <Chapter title="Architecture" body={project.architecture} />

          {project.components.length > 0 ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                Services
              </h2>
              <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
                {project.components.map((component) => (
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

          {project.decisions.length > 0 ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
                Decisions
              </h2>
              <dl className="mt-6 space-y-6">
                {project.decisions.map((decision) => (
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

          <Chapter title="Outcome" body={project.outcome} />

          {!hasCaseStudy(project) ? (
            <Reveal as="section" className="border-t border-line pt-10">
              <p className="max-w-[62ch] text-base leading-relaxed text-ink-subtle">
                A full write-up of this project is still to come. In the
                meantime, the stack and structure above give the shape of it —
                and the assistant can answer questions about the work.
              </p>
            </Reveal>
          ) : null}
        </div>

        {others.length > 0 ? (
          <nav
            aria-label="More projects"
            className="mt-20 border-t border-line pt-10"
          >
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
              More work
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/projects/${other.slug}`}
                    className="block rounded-lg border border-line p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
                  >
                    <p className="font-display text-xl text-ink">
                      {other.name}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">
                      {other.summary}
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
