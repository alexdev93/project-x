import React from "react";
import { cn } from "@/lib/utils";

/**
 * The shared text-input surface.
 *
 * Exported so `Textarea` — and anything else that needs to look like a field
 * without being an `<input>`, such as a select or a composer — can wear the
 * same skin instead of approximating it. Every field in the project should
 * resolve to this one string.
 */
export const controlClass =
  "w-full rounded-[var(--radius)] border border-line bg-surface px-3.5 py-2.5 text-base text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:border-accent focus:outline-none focus-visible:outline-none " +
  "disabled:opacity-60";

/**
 * `error` is the same array shape a zod `flatten().fieldErrors` entry has, so a
 * caller can hand a field its errors straight from the API response without
 * reshaping. Passing it wires `aria-invalid` and `aria-describedby` for free —
 * two attributes that were repeated at every call site before, and are exactly
 * the sort of thing that gets forgotten on the fifth field.
 *
 * The described-by target is `${id}-error`, which is the id `Field` gives its
 * error paragraph. The two components agree on that convention and nothing else.
 */
export type ControlErrorProps = {
  error?: string[];
};

export function controlAria(id: string | undefined, error?: string[]) {
  const invalid = Boolean(error?.length);
  return {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid && id ? `${id}-error` : undefined,
  };
}

type InputProps = ControlErrorProps &
  React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, id, ...props }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        className={cn(controlClass, className)}
        {...controlAria(id, error)}
        {...props}
      />
    );
  },
);
