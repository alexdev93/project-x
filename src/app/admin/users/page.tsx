import React from "react";
import { UserTable } from "@/components/admin/UserTable";
import { requireAdminPage } from "@/lib/auth/session";
import { hasBlog } from "@/lib/blog/config";
import { listUsers } from "@/lib/db/users";
import type { BlogUser } from "@/lib/blog/types";

/**
 * Everyone who has signed in.
 *
 * This is the only screen in the project that shows an email address, and the
 * only data path that selects one — the public comment projection deliberately
 * cannot. Worth remembering if this list ever grows an export.
 */

export default async function AdminUsersPage() {
  const admin = await requireAdminPage();
  const users = await read();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Readers</h1>
        <p className="mt-1 text-sm text-ink-muted">
          People who have signed in to comment. Blocking stops new comments; it
          does not remove old ones.
        </p>
      </header>

      <UserTable initialUsers={users} currentUserId={admin.id} />
    </div>
  );
}

async function read(): Promise<BlogUser[]> {
  if (!hasBlog()) return [];

  try {
    return await listUsers(200);
  } catch (error) {
    console.error(
      "[admin] user list failed:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
