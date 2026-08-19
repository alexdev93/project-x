import React from "react";
import { Label } from "./Label";
import { cn } from "@/lib/utils";

/**
 * Label, control, and validation message as one unit.
 *
 * Only the first error is shown. zod can return several for one field and
 * stacking them under an input reads as shouting; fixing the first usually
 * clears the rest.
 *
 * The error paragraph's id is `${id}-error`, which is the id `Input` and
 * `Textarea` point `aria-describedby` at when they are given the same errors.
 * That is the whole contract between them — pass the same `id` and the same
 * `error` to both and the announcement is wired correctly.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  /** Static guidance, shown whether or not the field is in error. */
  hint?: string;
  error?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-sm text-ink-subtle">{hint}</p> : null}
      {children}
      {error?.length ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-accent">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}
