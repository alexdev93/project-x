"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { navItems } from "@/lib/site";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { AlexLogo } from "@/components/brand/AlexLogo";

/** True once the page has scrolled far enough to warrant a divider. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

export function Header({ wordmark }: { wordmark: string }) {
  const pathname = usePathname();
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        // Transparent until scrolled, so the hero reads full-bleed on load.
        scrolled
          ? "border-line bg-canvas/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <Container width="wide">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={`${wordmark} — home`}
            className="text-ink transition-opacity hover:opacity-70"
          >
            {/* Animated on the header only: it plays once on load and is the
                first thing a visitor sees. The link carries the label, so the
                logo itself stays hidden from assistive tech. */}
            <AlexLogo animated className="h-6" />
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                        active
                          ? "text-ink"
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

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}
