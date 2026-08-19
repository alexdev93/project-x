import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Page links for a paginated list.
 *
 * Anchors, not buttons: pagination is navigation, so it must work with
 * JavaScript disabled, survive a shared URL, and let a crawler walk to page two.
 * That also keeps this a server component with no client bundle.
 *
 * Renders nothing at all for a single page rather than a disabled widget —
 * chrome that can never do anything is just noise.
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  className,
  label = "Pagination",
}: {
  /** 1-based. */
  page: number;
  pageCount: number;
  /** Builds the href for a page number, so the query-string shape stays with the caller. */
  hrefFor: (page: number) => string;
  className?: string;
  label?: string;
}) {
  if (pageCount <= 1) return null;

  const current = Math.min(Math.max(page, 1), pageCount);

  return (
    <nav aria-label={label} className={cn("flex items-center justify-center gap-2", className)}>
      <Step
        href={current > 1 ? hrefFor(current - 1) : undefined}
        label="Previous page"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      />

      <p aria-live="polite" className="px-2 font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
        Page {current} of {pageCount}
      </p>

      <Step
        href={current < pageCount ? hrefFor(current + 1) : undefined}
        label="Next page"
        icon={<ChevronRight aria-hidden className="size-4" />}
      />
    </nav>
  );
}

/**
 * An absent `href` renders a `<span>`, not a disabled link. There is no such
 * thing as a disabled anchor in HTML — `aria-disabled` on one is still
 * focusable and still followed — so the ends of the range simply stop being
 * links.
 */
function Step({
  href,
  label,
  icon,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
}) {
  const shape =
    "flex size-10 items-center justify-center rounded-[var(--radius)] border border-line";

  if (!href) {
    return (
      <span aria-hidden className={cn(shape, "text-ink-subtle opacity-40")}>
        {icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(shape, "text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink")}
    >
      {icon}
    </Link>
  );
}
