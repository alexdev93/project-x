"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { navItems } from "@/lib/site";
import { AlexLogo } from "@/components/brand/AlexLogo";
import { profile } from "@/content";
import { cn } from "@/lib/utils";

/**
 * Full-height slide-over navigation for small screens.
 *
 * Handles the four things a dialog has to get right: Escape closes it, focus
 * moves into it and cannot leave while open, background scroll is locked, and
 * focus returns to the trigger on close.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on navigation. Without this the panel survives a route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus into the panel so the first Tab lands somewhere sensible.
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      // Wrap focus at both ends so Tab cannot escape to the page behind.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, close]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className="absolute inset-0 h-full w-full cursor-default bg-canvas/80 backdrop-blur-sm"
              onClick={close}
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col border-l border-line bg-surface shadow-[var(--shadow-overlay)]"
              initial={reduced ? { opacity: 0 } : { x: "100%" }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-16 items-center justify-between px-5">
                <div className="flex items-center gap-2.5">
                  <AlexLogo variant="icon" className="h-6 w-6 text-ink" />
                  <span className="font-display text-lg text-ink">
                    {profile.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close menu"
                  onClick={close}
                >
                  <X />
                </Button>
              </div>

              <nav aria-label="Mobile" className="px-3 pb-8">
                <ul className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            // 48px tall — comfortably above the 44px touch target floor.
                            "flex min-h-12 items-center rounded-[var(--radius)] px-4 text-base transition-colors",
                            active
                              ? "bg-surface-raised text-ink"
                              : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
