import {
  education,
  experiences,
  formatDateRange,
  getCareerFacts,
  profile,
  projects,
  skillGroups,
} from "@/content";

/**
 * Serialises the portfolio content into the grounding context the model reads.
 *
 * Built once per process and cached: the content is inlined at build time and
 * identical for every request. Rebuilding it per request would burn CPU and
 * tokens for the same string.
 *
 * The one time-dependent value is the years total, which is resolved when the
 * process first serves a request. It only changes on an anniversary, and a
 * serverless process is far shorter-lived than that, so the memo is safe.
 */

function buildContext(): string {
  const sections: string[] = [];

  sections.push(
    [
      "## Identity",
      `Full name: ${profile.name}`,
      `Referred to as: ${profile.shortName}`,
      `Role: ${profile.role}`,
      `Location: ${profile.location}`,
      `Positioning: ${profile.tagline}`,
      `Availability: ${profile.availability.open ? profile.availability.message : "Not currently looking"}`,
      "",
      "Biography:",
      ...profile.bio.map((paragraph) => `- ${paragraph}`),
    ].join("\n"),
  );

  sections.push(
    [
      "## Focus areas",
      ...profile.focusAreas.map(
        (area) => `- ${area.title}: ${area.description}`,
      ),
    ].join("\n"),
  );

  // Pre-computed totals, from the same function the site's own stat block uses.
  // Without these the model derives its own figures from the overlapping date
  // ranges below and gets them wrong — it read the roles here as "about 5
  // years" while the homepage said 6+. Stating the totals keeps one derivation.
  sections.push(
    [
      "## Career totals",
      "Already calculated from the records below. Quote these figures; do not",
      "recompute them from the dates, which overlap and undercount.",
      ...getCareerFacts().map((fact) => `- ${fact.label}: ${fact.value}`),
    ].join("\n"),
  );

  sections.push(
    [
      "## Experience (most recent first)",
      ...experiences.map((entry) =>
        [
          `### ${entry.title} — ${entry.company}`,
          `Period: ${formatDateRange(entry)}`,
          `Type: ${entry.kind}`,
          entry.location ? `Location: ${entry.location}` : null,
          `Summary: ${entry.summary}`,
          "Contributions:",
          ...entry.highlights.map((highlight) => `- ${highlight}`),
          `Technologies: ${entry.tech.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Projects",
      ...projects.map((project) => {
        const lines: string[] = [
          `### ${project.name} (/projects/${project.slug})`,
          `Category: ${project.category}`,
          `Year: ${project.year}`,
          `Role: ${project.role}`,
          `Summary: ${project.summary}`,
          `Technologies: ${project.tech.join(", ")}`,
        ];

        if (project.repo) {
          lines.push(
            `Repository: ${project.repo.name} (${project.repo.visibility})`,
          );
        }

        // Only include narrative fields that have been written. An empty field
        // must not appear as an empty heading, or the model may treat the
        // absence as a fact about the work.
        if (project.problem) lines.push(`Problem: ${project.problem}`);
        if (project.approach) lines.push(`Approach: ${project.approach}`);
        if (project.architecture)
          lines.push(`Architecture: ${project.architecture}`);
        if (project.outcome) lines.push(`Outcome: ${project.outcome}`);

        if (project.decisions.length > 0) {
          lines.push("Key decisions:");
          for (const decision of project.decisions) {
            lines.push(`- ${decision.title}: ${decision.detail}`);
          }
        }

        if (project.components.length > 0) {
          lines.push("Services and components:");
          for (const component of project.components) {
            lines.push(`- ${component.name}: ${component.description}`);
          }
        }

        return lines.join("\n");
      }),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Technical skills",
      "Depth bands: core = used daily and owned; working = shipped with; familiar = used but not owned.",
      ...skillGroups.map((group) =>
        [
          `### ${group.title}`,
          group.description,
          ...group.skills.map((skill) => `- ${skill.name} (${skill.depth})`),
        ].join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## Education and training",
      ...education.map((entry) =>
        [
          `- ${entry.credential}, ${entry.institution} (${entry.year})`,
          entry.detail ? `  ${entry.detail}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n"),
  );

  sections.push(
    [
      "## Contact",
      `Email: ${profile.email}`,
      `Contact page: /contact`,
      ...profile.socials.map((social) => `${social.label}: ${social.href}`),
    ].join("\n"),
  );

  return sections.join("\n\n---\n\n");
}

let cached: string | null = null;

export function getPortfolioContext(): string {
  cached ??= buildContext();
  return cached;
}
