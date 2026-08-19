"use client";

import React, { useState } from "react";
import { AlertCircle, Check, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { SectionKey } from "@/lib/content-editor/sections";

/**
 * Editing a content file as JSON.
 *
 * A structured form per section would be friendlier, and it is the obvious next
 * step — but it would be six forms mirroring six schemas, and the mirror is
 * exactly the thing that drifts. This edits the document directly, validates it
 * against the *same* schema the build uses, and refuses to save anything that
 * would break the site. It is honest about what it is, which for a single-author
 * portfolio is worth more than a nicer form that can disagree with reality.
 *
 * Two guards before anything leaves the browser: the JSON must parse, and the
 * server re-validates against the schema regardless. Parse errors are reported
 * with the position the parser objected to, since "unexpected token at 412" is
 * the difference between a fixable mistake and a hunt.
 */

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; url: string }
  | { kind: "error"; message: string; issues?: string[] };

export function ContentEditor({
  sectionKey,
  initialData,
  sha,
}: {
  sectionKey: SectionKey;
  initialData: unknown;
  sha: string;
}) {
  const original = JSON.stringify(initialData, null, 2);

  const [text, setText] = useState(original);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const dirty = text !== original;
  const saving = status.kind === "saving";

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? `That isn't valid JSON — ${error.message}`
            : "That isn't valid JSON.",
      });
      return;
    }

    setStatus({ kind: "saving" });

    try {
      const response = await fetch(`/api/admin/content/${sectionKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed, sha }),
      });
      const result = await response.json();

      if (!result.success) {
        setStatus({
          kind: "error",
          message: result.error ?? "That didn't save.",
          issues: result.issues,
        });
        return;
      }

      setStatus({ kind: "saved", url: result.url });
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the server. Your edit is still here.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={saving}
        rows={28}
        spellCheck={false}
        aria-label={`${sectionKey} content as JSON`}
        className="font-mono text-[0.8125rem] leading-relaxed"
      />

      {status.kind === "error" ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <p className="flex items-start gap-2.5">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {status.message}
          </p>

          {status.issues?.length ? (
            <ul className="ml-6 list-disc space-y-1 font-mono text-xs">
              {status.issues.slice(0, 12).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
              {status.issues.length > 12 ? (
                <li>…and {status.issues.length - 12} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {status.kind === "saved" ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-sm text-ink-muted"
        >
          <Check aria-hidden className="size-4 text-accent" />
          Committed. The site rebuilds automatically and will show this in a
          minute or two.
          <a
            href={status.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            View the commit
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={saving || !dirty} onClick={save}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save and commit
        </Button>

        <Button
          variant="ghost"
          size="lg"
          disabled={saving || !dirty}
          onClick={() => {
            setText(original);
            setStatus({ kind: "idle" });
          }}
        >
          <RotateCcw />
          Discard changes
        </Button>

        {dirty && status.kind !== "saved" ? (
          <p className="text-sm text-ink-subtle">Unsaved changes</p>
        ) : null}
      </div>
    </div>
  );
}
