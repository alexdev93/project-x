"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copy-to-clipboard button with a transient confirmation state. */
export function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — leave the
      // button in its resting state rather than claiming a copy that failed.
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line",
        "bg-surface px-2 py-1 font-mono text-[11px] text-ink-muted transition-colors",
        "hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3" />
      ) : (
        <Copy aria-hidden className="size-3" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
  // The <code> child carries the text; read it for the copy action.
  const text = React.useMemo(() => extractText(children), [children]);

  return (
    <div className="group relative my-4">
      <CopyButton
        value={text}
        className="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      />
      <pre className="overflow-x-auto rounded-[var(--radius)] border border-line bg-surface-raised p-4 text-[13px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}
