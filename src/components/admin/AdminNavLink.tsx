"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * One navigation item, highlighted when its section is open.
 *
 * The only reason any of the admin chrome is a client component: `usePathname`.
 * Keeping it to this leaf means the shell around it stays server-rendered.
 *
 * `exact` exists for the overview link, which would otherwise match every page
 * beneath /admin.
 */
export function AdminNavLink({
  href,
  label,
  exact = false,
  children,
}: {
  href: string;
  label: string;
  exact?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 whitespace-nowrap rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-surface-raised text-ink"
          : "text-ink-muted hover:bg-surface-raised hover:text-ink",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
