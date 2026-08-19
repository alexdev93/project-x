"use client";

import { useEffect, type RefObject } from "react";

/**
 * The four things an overlay has to get right, in one place: Escape closes it,
 * focus cannot leave it while it is open, background scroll is locked, and
 * focus returns to whatever was focused before it opened.
 *
 * This was duplicated almost verbatim in MobileNav and ChatLauncher, differing
 * only in the focusable selector and whether initial focus was moved. Both
 * differences are options here, so there is one implementation to get right.
 *
 * Note what it does *not* do: it does not render a backdrop, set `role`, or set
 * `aria-modal`. Those belong to the markup, and hiding them inside a hook makes
 * them easy to forget when the next overlay is written without it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap({
  active,
  containerRef,
  onClose,
  autoFocus = false,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement>;
  onClose: () => void;
  /**
   * Move focus to the first focusable child on open. Right for a panel whose
   * content is already mounted; wrong for one that lazy-loads, where the first
   * focusable element at open time is a loading state that is about to vanish.
   */
  autoFocus?: boolean;
}) {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    if (autoFocus) {
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;

      const focusables =
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      // Wrap at both ends so Tab cannot reach the page behind the overlay.
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
  }, [active, autoFocus, containerRef, onClose]);
}
