"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { slugify } from "@/lib/blog/text";
import type { Post } from "@/lib/blog/types";

/**
 * Writing a post.
 *
 * An uncontrolled form, the same shape as ContactForm: values live in the DOM,
 * `FormData` reads them on submit, and the only state is the request's status
 * and the field errors that came back. Controlled inputs would re-render the
 * whole editor on every keystroke of a long body for no benefit.
 *
 * The slug is derived from the title *until the author edits it*, at which point
 * it is theirs. Two rules make that behave: derivation stops the moment the slug
 * field is touched, and it never rewrites the slug of a post that already exists,
 * because changing a published URL should be a deliberate act.
 */

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type FieldErrors = Partial<Record<"title" | "slug" | "body" | "excerpt" | "tags", string[]>>;

export function PostEditor({ post }: { post?: Post }) {
  const router = useRouter();
  const editing = Boolean(post);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [deleting, setDeleting] = useState(false);

  const slugRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(editing);

  function onTitleInput(event: React.FormEvent<HTMLInputElement>) {
    if (slugTouched.current || !slugRef.current) return;
    slugRef.current.value = slugify(event.currentTarget.value);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus({ kind: "saving" });
    setFieldErrors({});

    const payload = {
      title: String(data.get("title") ?? ""),
      slug: String(data.get("slug") ?? ""),
      body: String(data.get("body") ?? ""),
      excerpt: String(data.get("excerpt") ?? ""),
      // Comma-separated in the UI because that is how people type tags; the API
      // takes an array, so the split happens here rather than on the server.
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(
        editing ? `/api/admin/posts/${post!.id}` : "/api/admin/posts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        setStatus({
          kind: "error",
          message: result.error ?? "That didn't save.",
        });
        return;
      }

      setStatus({ kind: "saved" });

      if (!editing) {
        router.push(`/admin/posts/${result.post.id}`);
        return;
      }
      // Pulls the server's copy back so the list and this form agree.
      router.refresh();
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Your text is still here.",
      });
    }
  }

  async function onDelete() {
    if (!post) return;
    // A real confirm, because this cascades to every comment on the post.
    if (!window.confirm(`Delete "${post.title || post.slug}" and its comments?`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (!result.success) {
        setStatus({ kind: "error", message: result.error ?? "Couldn't delete that." });
        return;
      }

      router.push("/admin/posts");
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server." });
    } finally {
      setDeleting(false);
    }
  }

  const saving = status.kind === "saving";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field id="title" label="Title" error={fieldErrors.title}>
        <Input
          id="title"
          name="title"
          defaultValue={post?.title ?? ""}
          onInput={onTitleInput}
          disabled={saving}
          error={fieldErrors.title}
          placeholder="Optional — a short thought needs no headline"
          autoComplete="off"
        />
      </Field>

      <Field
        id="slug"
        label="Slug"
        error={fieldErrors.slug}
        hint={
          editing
            ? "Changing this changes the post's URL, and old links will stop working."
            : "Filled in from the title until you edit it."
        }
      >
        <Input
          id="slug"
          name="slug"
          ref={slugRef}
          defaultValue={post?.slug ?? ""}
          onInput={() => {
            slugTouched.current = true;
          }}
          disabled={saving}
          error={fieldErrors.slug}
          placeholder="counting-likes-without-a-transaction"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <Field
        id="body"
        label="Body"
        error={fieldErrors.body}
        hint="Markdown. Headings, lists, links, quotes and code all work."
      >
        <Textarea
          id="body"
          name="body"
          rows={20}
          defaultValue={post?.body ?? ""}
          disabled={saving}
          error={fieldErrors.body}
          placeholder="Write."
          className="font-mono text-sm leading-relaxed"
        />
      </Field>

      <Field
        id="excerpt"
        label="Excerpt"
        error={fieldErrors.excerpt}
        hint="Shown on the feed card. Left empty, the opening lines are used."
      >
        <Textarea
          id="excerpt"
          name="excerpt"
          rows={3}
          defaultValue={post?.excerpt ?? ""}
          disabled={saving}
          error={fieldErrors.excerpt}
        />
      </Field>

      <Field id="tags" label="Tags" error={fieldErrors.tags} hint="Comma-separated.">
        <Input
          id="tags"
          name="tags"
          defaultValue={post?.tags.join(", ") ?? ""}
          disabled={saving}
          error={fieldErrors.tags}
          placeholder="postgres, architecture"
          autoComplete="off"
        />
      </Field>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {editing ? "Save changes" : "Create draft"}
        </Button>

        {status.kind === "saved" ? (
          <p role="status" className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Check aria-hidden className="size-4" />
            Saved
          </p>
        ) : null}

        {editing ? (
          <Button
            variant="ghost"
            size="lg"
            className="ml-auto text-ink-subtle hover:text-accent"
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
