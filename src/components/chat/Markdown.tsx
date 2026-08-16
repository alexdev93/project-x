"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/**
 * Markdown renderer for assistant messages.
 *
 * Deliberately no syntax highlighting: a highlighter is a large dependency and
 * this assistant answers questions about a career, not code listings. Code
 * blocks get monospace, a scroll container and a copy button, which is what the
 * occasional config snippet actually needs.
 */

const components: Components = {
  a({ href, children, ...props }) {
    const target = href ?? "";
    // Internal paths route client-side; anything else opens safely offsite.
    if (target.startsWith("/")) {
      return (
        <Link
          href={target}
          className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
        {...props}
      >
        {children}
      </a>
    );
  },

  p({ children }) {
    return <p className="my-3 first:mt-0 last:mb-0">{children}</p>;
  },

  ul({ children }) {
    return <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>;
  },

  ol({ children }) {
    return <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>;
  },

  strong({ children }) {
    return <strong className="font-semibold text-ink">{children}</strong>;
  },

  h1({ children }) {
    return <h3 className="mb-2 mt-5 font-display text-xl text-ink">{children}</h3>;
  },
  h2({ children }) {
    return <h3 className="mb-2 mt-5 font-display text-xl text-ink">{children}</h3>;
  },
  h3({ children }) {
    return <h4 className="mb-2 mt-4 font-medium text-ink">{children}</h4>;
  },

  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-2 border-line-strong pl-4 text-ink-subtle">
        {children}
      </blockquote>
    );
  },

  code({ className, children }) {
    // react-markdown gives fenced blocks a language- class; inline code has none.
    const isBlock = Boolean(className?.startsWith("language-"));

    if (isBlock) {
      return <code className={className}>{children}</code>;
    }

    return (
      <code className="rounded-[4px] border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
        {children}
      </code>
    );
  },

  pre({ children }) {
    return <CodeBlock>{children}</CodeBlock>;
  },

  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-line px-3 py-2 font-medium text-ink">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-line px-3 py-2">{children}</td>;
  },
};

export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink-muted">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
