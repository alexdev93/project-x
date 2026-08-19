import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * The admin area.
 *
 * `force-dynamic` because everything here depends on who is asking, and a cached
 * admin page is a serious bug rather than a performance win.
 *
 * **The guard below protects this layout's own chrome and nothing else.** It is
 * not the boundary for data, and that is measured rather than assumed: Next
 * renders a layout and its page *concurrently*, so during development a
 * non-administrator whose request this layout refused still received the
 * dashboard's markup, because `page.tsx` had already run its queries. Every
 * admin page therefore calls `requireAdminPage()` itself before reading
 * anything, and every `/api/admin/*` handler calls `requireAdmin()` — a layout
 * does not run for route handlers at all.
 *
 * Three guards, three scopes: the middleware bounces anonymous visitors before a
 * request reaches the server, this one keeps the shell from rendering, and the
 * checks inside pages and handlers are what actually protect data.
 *
 * `notFound()` rather than a redirect or a 403: a signed-in visitor who is not
 * the owner sees exactly what a crawler sees. There is nothing here to discover
 * by probing, and the response says nothing about whether ADMIN_EMAILS is even
 * configured.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  // Belt and braces with the disallow rule in robots.ts. A crawler that ignores
  // robots.txt still sees this, and the pages 404 for it anyway.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `headers()` is read here rather than in each page, which keeps the session
  // lookup to one per navigation.
  headers();

  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();

  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
