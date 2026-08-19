import React from "react";
import { PostEditor } from "@/components/admin/PostEditor";
import { requireAdminPage } from "@/lib/auth/session";

export default async function NewPostPage() {
  await requireAdminPage();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-ink">New post</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Saved as a draft. Nothing is public until you publish it from the list.
        </p>
      </header>

      <PostEditor />
    </div>
  );
}
