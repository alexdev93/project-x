import React from "react";
import { cn } from "@/lib/utils";

/**
 * Typography for long-form writing.
 *
 * Written as descendant selectors rather than by styling each element, because
 * the markdown renderer emits plain tags and there is nowhere to hang a class.
 * `@tailwindcss/typography` would do this too, but it is a dependency and a
 * theme override for what is thirty lines of rules against tokens this project
 * already defines.
 *
 * The measure is set here, not by the page: 68 characters is the same value
 * `Container width="prose"` uses, so an article and a prose page read at the
 * same width.
 */
export function Prose({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[1.0625rem] leading-[1.75] text-ink-muted",

        // Headings. The article's own h1 is the page title, so a body heading
        // starts at h2 — which is why the chat renderer's h1→h3 remap would be
        // wrong here.
        "[&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:text-ink",
        "[&_h3]:mt-9 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink",
        "[&_h4]:mt-8 [&_h4]:font-medium [&_h4]:text-ink",

        "[&_p]:mt-5",
        "[&_a]:text-accent [&_a]:underline [&_a]:decoration-accent/30 [&_a]:underline-offset-4",
        "hover:[&_a]:decoration-accent",
        "[&_strong]:font-medium [&_strong]:text-ink",

        "[&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:mt-2 [&_li]:pl-1",
        "marker:[&_li]:text-ink-subtle",

        "[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40",
        "[&_blockquote]:pl-5 [&_blockquote]:italic",

        // Inline code sits inside a line of prose, so it takes the raised
        // surface rather than a border, which would disturb the line height.
        "[&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1.5 [&_code]:py-0.5",
        "[&_code]:font-mono [&_code]:text-[0.875em] [&_code]:text-ink",

        // A block scrolls inside itself. Long lines must never widen the page —
        // that is the single most common way an article breaks on a phone.
        "[&_pre]:mt-6 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius)]",
        "[&_pre]:border [&_pre]:border-line [&_pre]:bg-surface [&_pre]:p-4",
        "[&_pre]:text-sm [&_pre]:leading-relaxed",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-ink-muted",

        "[&_hr]:my-10 [&_hr]:border-line",

        // Tables come from remark-gfm. Wrapped so a wide one scrolls rather
        // than stretching the article.
        "[&_table]:mt-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto",
        "[&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-ink",
        "[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2",

        // First element flush with the top, whatever it is.
        "[&>*:first-child]:mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
