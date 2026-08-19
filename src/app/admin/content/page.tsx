import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { canCommitContent } from "@/lib/content-editor/github";
import { SECTIONS, SECTION_KEYS } from "@/lib/content-editor/sections";

/**
 * The content sections, as a menu.
 *
 * The note about how saving works is on this page rather than buried in each
 * editor, because it changes what someone should expect: a save is a commit, and
 * the site rebuilds afterwards. Somebody who does not know that will reasonably
 * think a save failed when the page does not change immediately.
 */

export default async function AdminContentPage() {
  await requireAdminPage();
  const configured = canCommitContent();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Site content</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
          The text on your portfolio pages. Saving writes a commit to the
          repository, which starts a deployment — changes are live a minute or
          two later, and every edit can be undone from the repository&apos;s
          history.
        </p>
      </header>

      {configured ? null : (
        <p className="rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          Editing is read-only until GITHUB_TOKEN and GITHUB_REPO are set. The
          current values are still shown below.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTION_KEYS.map((key) => {
          const section = SECTIONS[key];
          return (
            <li key={key}>
              <Link
                href={`/admin/content/${key}`}
                className="group flex h-full flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{section.label}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-sm leading-relaxed text-ink-muted">
                  {section.description}
                </span>
                <span className="mt-auto pt-2 font-mono text-xs text-ink-subtle">
                  {section.file}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
