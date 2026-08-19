import React from "react";
import Link from "next/link";
import { FileText, MessageSquare, PenLine, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { countPostsByStatus } from "@/lib/db/posts";
import { countPendingComments } from "@/lib/db/comments";
import { countUsers } from "@/lib/db/users";
import { hasBlog } from "@/lib/blog/config";
import { requireAdminPage } from "@/lib/auth/session";

/**
 * The overview.
 *
 * Four numbers and the one action worth having on the front page. Deliberately
 * not a chart or an activity feed: at this scale those would be decoration, and
 * the useful question when the owner opens this page is "is anything waiting for
 * me".
 *
 * Reads directly from the data layer rather than through `service.ts`, because
 * that module's caching exists to keep public pages fast and would only serve
 * stale numbers here — but the failure handling is the same, since a sleeping
 * database should show zeroes and a note, not an error page.
 */

export default async function AdminOverviewPage() {
  // Before any read. The layout's guard governs the chrome, not this page —
  // Next renders the two concurrently, so a page that only trusted the layout
  // would still execute its queries for a visitor who was refused.
  await requireAdminPage();

  const stats = await readStats();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {stats
              ? "Everything you have published, and anything waiting on you."
              : "The database isn't reachable, so these are placeholders."}
          </p>
        </div>

        <ButtonLink href="/admin/posts/new">
          <PenLine />
          Write a post
        </ButtonLink>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Published"
          value={stats?.published ?? 0}
          href="/admin/posts"
          icon={<FileText aria-hidden className="size-4" />}
        />
        <Stat
          label="Drafts"
          value={stats?.draft ?? 0}
          href="/admin/posts"
          icon={<PenLine aria-hidden className="size-4" />}
        />
        <Stat
          label="Awaiting review"
          value={stats?.pending ?? 0}
          href="/admin/comments"
          icon={<MessageSquare aria-hidden className="size-4" />}
          // The only number that is ever a call to action.
          emphasise={(stats?.pending ?? 0) > 0}
        />
        <Stat
          label="Readers"
          value={stats?.users ?? 0}
          href="/admin/users"
          icon={<Users aria-hidden className="size-4" />}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon,
  emphasise = false,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  emphasise?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-raised"
    >
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        {icon}
        {label}
      </span>
      <span
        className={
          emphasise
            ? "font-display text-4xl text-accent"
            : "font-display text-4xl text-ink"
        }
      >
        {value}
      </span>
    </Link>
  );
}

/**
 * Null when the database is unreachable, so the page renders with zeroes and an
 * honest note rather than a 500. The same policy the public blog follows.
 */
async function readStats() {
  if (!hasBlog()) return null;

  try {
    const [posts, pending, users] = await Promise.all([
      countPostsByStatus(),
      countPendingComments(),
      countUsers(),
    ]);
    return { ...posts, pending, users };
  } catch (error) {
    console.error(
      "[admin] overview stats failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
