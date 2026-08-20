import React from "react";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { AppCard } from "@/components/apps/AppCard";
import { apps, projects } from "@/content";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected engineering work — distributed systems, backend services, infrastructure and full-stack products.",
};

export default function ProjectsPage() {
  return (
    <Section width="wide" size="lg">
      <SectionHeader
        as="h1"
        eyebrow="Work"
        title="Projects"
        description="Systems I've designed or built. Each one lists the stack, the shape of the architecture, and where I fit into it."
      />

      <Stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <StaggerItem key={project.slug} className="h-full">
            {/* h2: the page title above is the h1. */}
            <ProjectCard project={project} className="h-full" headingLevel={2} />
          </StaggerItem>
        ))}
      </Stagger>

      {apps.length > 0 ? (
        <div className="mt-20 sm:mt-24">
          <SectionHeader
            as="h2"
            eyebrow="Also shipped"
            title="Apps"
            description="Things you can install, not just read about."
          />

          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
            {apps.map((app) => (
              <StaggerItem key={app.slug} className="h-full">
                <AppCard app={app} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      ) : null}
    </Section>
  );
}
