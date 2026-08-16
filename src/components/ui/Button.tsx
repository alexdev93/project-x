import React from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium " +
  "transition-[background-color,border-color,color,opacity] duration-200 ease-out " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  // Icons inherit sizing so callers never set icon dimensions by hand.
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink-subtle hover:bg-surface-raised",
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
  /** Reads as body text until hovered — for tertiary actions inside prose. */
  link: "text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  /** Square, for icon-only buttons. Always pair with an aria-label. */
  icon: "size-10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonProps = ButtonOwnProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);

type ButtonLinkProps = ButtonOwnProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Same visual treatment as Button for things that navigate. Kept separate
 * rather than polymorphic so anchors keep anchor semantics and props.
 */
export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(
    { variant = "primary", size = "md", className, ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
