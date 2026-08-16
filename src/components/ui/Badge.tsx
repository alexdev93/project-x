import React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line bg-surface-raised text-ink-muted",
  accent: "border-accent/25 bg-accent-soft text-accent",
  /** For states that need to read as inactive, e.g. a private repository. */
  quiet: "border-line bg-transparent text-ink-subtle",
} as const;

type BadgeProps = React.ComponentPropsWithoutRef<"span"> & {
  tone?: keyof typeof tones;
};

/** Small status marker. For technology labels use TechTag instead. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "font-mono text-[11px] uppercase tracking-[0.08em]",
        "[&_svg]:size-3 [&_svg]:shrink-0",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Technology label. Visually quieter than Badge because these appear in
 * groups of ten or more and must not compete with the content they describe.
 */
export function TechTag({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-line",
        "bg-surface px-2 py-1 font-mono text-xs text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TechTagList({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <li key={item}>
          <TechTag>{item}</TechTag>
        </li>
      ))}
    </ul>
  );
}
