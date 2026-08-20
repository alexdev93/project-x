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

    // Plain `overflow: hidden` on <body> does not reliably stop background
    // scroll on iOS Safari — if the page has any rubber-band momentum left
    // over from the tap that opened this overlay, it keeps scrolling behind
    // it, which is what reads as the panel "jumping" on open. Pinning the
    // body in place at its current scroll offset, then restoring both the
    // styles and the scroll position on close, is the standard fix — an
    // `overflow` toggle alone only ever worked some of the time by luck.
    const scrollY = window.scrollY;
    const body = document.body;
    const previousStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

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

      body.style.position = previousStyle.position;
      body.style.top = previousStyle.top;
      body.style.left = previousStyle.left;
      body.style.right = previousStyle.right;
      body.style.width = previousStyle.width;
      body.style.overflow = previousStyle.overflow;
      // Pinning the body with `position: fixed` drops the browser's own
      // scroll position, so it has to be restored by hand — without this the
      // page silently jumps to the top the moment the overlay closes.
      // `behavior: "instant"` overrides the site-wide `scroll-behavior:
      // smooth` (globals.css) on purpose: restoring where the page already
      // was should be invisible, not a second visible scroll animation
      // layered on top of the overlay's own exit transition.
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });

      previouslyFocused?.focus();
    };
  }, [active, autoFocus, containerRef, onClose]);
}
