import "server-only";

import { del, put } from "@vercel/blob";

/**
 * The only place a post's cover image touches storage.
 *
 * `BLOB_READ_WRITE_TOKEN` is read implicitly by `put`/`del` — it's provisioned
 * automatically once Blob storage is enabled for this Vercel project, the
 * same way `DATABASE_URL` shows up once a Postgres integration is added.
 * Nothing here works without it, and there is no local fallback: like Neon,
 * this sandbox has no network path to it, so cover images can only be
 * exercised against the deployed site.
 *
 * `Date.now()` in the path means a replacement never collides with the file
 * it's replacing — the caller is responsible for deleting the old one.
 */
export async function uploadCoverImage(postId: string, file: File): Promise<string> {
  const blob = await put(`posts/${postId}/cover-${Date.now()}`, file, {
    access: "public",
    contentType: file.type,
  });
  return blob.url;
}

export async function deleteCoverImage(url: string): Promise<void> {
  await del(url).catch(() => {});
}
