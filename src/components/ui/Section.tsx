import React from "react";
import { cn } from "@/lib/utils";
import { Container, type ContainerWidth } from "./Container";

const spacing = {
  sm: "py-14 sm:py-16",
  md: "py-20 sm:py-24",
  lg: "py-24 sm:py-32 lg:py-40",
} as const;

type SectionProps = React.ComponentPropsWithoutRef<"section"> & {
  width?: ContainerWidth;
  size?: keyof typeof spacing;
  /** Set false to lay out the children yourself. */
  contained?: boolean;
};

/** Owns vertical rhythm so no page has to hand-tune section padding. */
export function Section({
  width = "content",
  size = "md",
  contained = true,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(spacing[size], className)} {...props}>
      {contained ? <Container width={width}>{children}</Container> : children}
    </section>
  );
}

type SectionHeaderProps = {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  /** Heading level — pick for document structure, not for size. */
  as?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
          {eyebrow}
        </span>
      ) : null}

      <Heading className="font-display text-4xl leading-[1.1] tracking-[-0.01em] text-ink sm:text-5xl">
        {title}
      </Heading>

      {description ? (
        <p
          className={cn(
            "max-w-[58ch] text-base leading-relaxed text-ink-muted sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
