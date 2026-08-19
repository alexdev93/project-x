import React from "react";
import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/**
 * A real `<label>` every time, never a styled `<span>` next to an input: the
 * `htmlFor` association is what makes the label clickable and what screen
 * readers announce with the field.
 */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}
