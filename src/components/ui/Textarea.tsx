import React from "react";
import { controlAria, controlClass, type ControlErrorProps } from "./Input";
import { cn } from "@/lib/utils";

type TextareaProps = ControlErrorProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * `resize-y` rather than the browser default `resize: both`: horizontal resize
 * lets a visitor drag a field wider than its container and break the layout.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, id, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        id={id}
        className={cn(controlClass, "resize-y", className)}
        {...controlAria(id, error)}
        {...props}
      />
    );
  },
);
