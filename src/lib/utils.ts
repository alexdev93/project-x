import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier ones in the same group. Without twMerge, a caller passing
 * `className="px-8"` to a component whose default is `px-4` would produce
 * both classes and an arbitrary winner.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
