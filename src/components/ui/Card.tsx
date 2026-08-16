import React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentPropsWithoutRef<"div"> & {
  as?: React.ElementType;
  /** Adds a hover treatment. Only use on cards that are actually clickable. */
  interactive?: boolean;
};

/**
 * Surfaces separate from the canvas by a hairline and a one-step background
 * change, not by shadow. Shadows are reserved for things that genuinely float
 * above the page (overlays, popovers).
 */
export function Card({
  as: Component = "div",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface",
        interactive &&
          "transition-colors duration-200 ease-out hover:border-line-strong hover:bg-surface-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
