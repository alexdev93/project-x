import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  LayoutDashboard,
  MessageSquare,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AdminNavLink } from "./AdminNavLink";

/**
 * Chrome for the admin area.
 *
 * A separate shell rather than the site header, because these are different
 * jobs: the site header is an invitation to browse, and this is a tool. It keeps
 * the same tokens, type and spacing so it still feels like one product — the
 * layout differs, the design language does not.
 *
 * A server component. Only the active-link highlight needs the pathname, so only
 * that small piece is a client component.
 */

const SECTIONS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/users", label: "Readers", icon: Users },
  { href: "/admin/content", label: "Site content", icon: SlidersHorizontal },
];

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <Container width="wide">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                <ArrowLeft aria-hidden className="size-4" />
                <span className="hidden sm:inline">Back to site</span>
              </Link>
              <span aria-hidden className="text-line-strong">
                /
              </span>
              <p className="font-display text-lg text-ink">Admin</p>
            </div>

            <p className="truncate text-sm text-ink-subtle">{userName}</p>
          </div>
        </Container>
      </header>

      <Container width="wide" className="py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Horizontally scrollable on small screens rather than collapsed
              behind a menu: a handful of destinations is few enough to show,
              and a tool's navigation should not need a tap to reveal. */}
          <nav
            aria-label="Admin sections"
            className="-mx-5 shrink-0 overflow-x-auto px-5 lg:mx-0 lg:w-48 lg:overflow-visible lg:px-0"
          >
            <ul className="flex gap-1 lg:flex-col">
              {SECTIONS.map((section) => (
                <li key={section.href}>
                  <AdminNavLink
                    href={section.href}
                    exact={section.exact}
                    label={section.label}
                  >
                    <section.icon aria-hidden className="size-4 shrink-0" />
                  </AdminNavLink>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </Container>
    </div>
  );
}
