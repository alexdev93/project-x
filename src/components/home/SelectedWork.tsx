import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { featuredProjects } from "@/content";

export function SelectedWork() {
  if (featuredProjects.length === 0) return null;

  return (
    <Section width="wide" size="lg">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          eyebrow="Selected work"
          title="Systems worth explaining"
          description="A few projects that show how I break a problem into services and keep the seams between them explicit."
        />

        <Link
          href="/projects"
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          All projects
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <Stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredProjects.map((project) => (
          <StaggerItem key={project.slug} className="h-full">
            <ProjectCard project={project} className="h-full" />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
