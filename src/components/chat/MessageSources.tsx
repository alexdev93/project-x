"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Source } from "@/lib/rag/types";
import type { KnowledgeCategory } from "@/lib/rag/types";
import { cn } from "@/lib/utils";

/**
 * Citations for an assistant answer.
 *
 * Rendered as quiet chips under the reply rather than as cards: an answer
 * usually cites two or three things, and full cards for each would out-weigh
 * the text they support. Project references get a card elsewhere, where the
 * answer is genuinely *about* that project.
 */

const LABELS: Record<KnowledgeCategory, string> = {
  profile: "About",
  experience: "Experience",
  project: "Project",
  skills: "Skills",
  education: "Education",
  contact: "Contact",
};

export function MessageSources({
  sources,
  className,
}: {
  sources: Source[];
  className?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("mt-4 border-t border-line pt-3", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
        Referenced
      </p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const label = LABELS[source.type] ?? "Portfolio";
          const content = (
            <>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-subtle">
                {label}
              </span>
              <span className="text-ink-muted">{source.title}</span>
              {source.url ? (
                <ArrowUpRight aria-hidden className="size-3 text-ink-subtle" />
              ) : null}
            </>
          );

          const shared =
            "inline-flex items-center gap-2 rounded-[var(--radius-sm)] " +
            "border border-line bg-surface px-2 py-1 text-xs";

          return (
            <li key={`${source.type}:${source.title}`}>
              {source.url ? (
                <Link
                  href={source.url}
                  className={cn(
                    shared,
                    "transition-colors hover:border-line-strong hover:bg-surface-raised",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span className={shared}>{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
