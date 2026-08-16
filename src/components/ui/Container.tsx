import React from "react";
import { cn } from "@/lib/utils";

const widths = {
  /** Long-form reading measure — roughly 68 characters. */
  prose: "max-w-[68ch]",
  /** Default page content width. */
  content: "max-w-5xl",
  /** Wider grids and galleries. */
  wide: "max-w-6xl",
  /** Edge-to-edge with gutters only. */
  full: "max-w-none",
} as const;

export type ContainerWidth = keyof typeof widths;

type ContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  width?: ContainerWidth;
  as?: React.ElementType;
};

/**
 * The single source of horizontal rhythm. Gutters step up with the viewport so
 * mobile keeps a comfortable thumb margin without desktop feeling cramped.
 */
export function Container({
  width = "content",
  as: Component = "div",
  className,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-5 sm:px-8 lg:px-10", widths[width], className)}
      {...props}
    />
  );
}
