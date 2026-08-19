import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { requireAdminPage } from "@/lib/auth/session";
import { canCommitContent, readContentFile } from "@/lib/content-editor/github";
import { SECTIONS, isSectionKey } from "@/lib/content-editor/sections";

/**
 * Editing one content file.
 *
 * The file is read from GitHub rather than from the local import, and that is
 * deliberate: the running deployment's copy is whatever was bundled at build
 * time, which may already be a version behind if a save has just happened. The
 * blob SHA that comes with it is what makes the save safe against two people —
 * or two tabs — editing at once.
 */

export default async function ContentSectionPage({
  params,
}: {
  params: { section: string };
}) {
  await requireAdminPage();

  if (!isSectionKey(params.section)) notFound();
  const section = SECTIONS[params.section];

  const file = canCommitContent()
    ? await readContentFile(section.file).catch((error) => {
        console.error(
          "[content] read failed:",
          error instanceof Error ? error.message : error,
        );
        return null;
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/admin/content"
          className="group inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          All sections
        </Link>

        <h1 className="mt-6 font-display text-3xl text-ink">{section.label}</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
          {section.description}
        </p>
        <p className="mt-1 font-mono text-xs text-ink-subtle">{section.file}</p>
      </header>

      {file ? (
        <ContentEditor
          sectionKey={section.key}
          initialData={file.data}
          sha={file.sha}
        />
      ) : (
        <p className="rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          Couldn&apos;t load this file from GitHub. Check that GITHUB_TOKEN and
          GITHUB_REPO are set and that the token can read this repository.
        </p>
      )}
    </div>
  );
}
