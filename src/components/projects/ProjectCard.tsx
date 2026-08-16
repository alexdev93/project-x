import React from "react";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { Badge, TechTagList } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { projectCategoryLabel, type Project } from "@/content";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  className,
  /**
   * Heading level for the card title. Callers set this to match their page
   * outline — the projects index has an h1 above the grid, the home page an
   * h2 — so the document never skips a level.
   */
  headingLevel = 3,
}: {
  project: Project;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;

  return (
    <Card interactive className={cn("group relative flex flex-col", className)}>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2">
          <Badge tone="accent">{projectCategoryLabel(project.category)}</Badge>
          {project.repo?.visibility === "private" ? (
            <Badge tone="quiet">
              <Lock aria-hidden />
              Private
            </Badge>
          ) : null}
        </div>

        <Heading className="mt-5 font-display text-2xl leading-tight text-ink">
          {/* Stretched link: the whole card is the hit area, but only the
              title is announced as the link target. */}
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0">
            {project.name}
          </Link>
        </Heading>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
          {project.summary}
        </p>

        <TechTagList items={project.tech.slice(0, 5)} className="mt-5" />

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-subtle">
            {project.year}
          </span>
          <ArrowUpRight
            aria-hidden
            className="size-4 text-ink-subtle transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
      </div>
    </Card>
  );
}
