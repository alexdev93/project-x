import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { ProjectMarkdown } from "@/components/projects/ProjectMarkdown";

/**
 * A titled block of case-study Markdown. Renders nothing when unwritten.
 * Shared by /projects/[slug] and /apps/[slug] — a project and an app get the
 * identical long-form treatment, see hasCaseStudy/hasAppCaseStudy.
 */
export function Chapter({ title, body }: { title: string; body: string }) {
  if (!body) return null;

  return (
    <Reveal as="section" className="border-t border-line pt-10">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
        {title}
      </h2>
      <div className="mt-5">
        <ProjectMarkdown>{body}</ProjectMarkdown>
      </div>
    </Reveal>
  );
}
