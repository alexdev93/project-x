"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { AlexLogo } from "@/components/brand/AlexLogo";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

/**
 * Loaded on demand. The panel pulls in the Markdown renderer, which is ~207 kB
 * — far too much to ship on every page for a button most visitors never press.
 * Deferring it keeps that cost on the interaction that actually needs it.
 */
const ChatPanel = dynamic(
  () => import("./ChatPanel").then((mod) => mod.ChatPanel),
  {
    ssr: false,
    loading: () => <BrandLoader compact message="Waking the assistant" />,
  },
);

/**
 * Opens the assistant as a slide-over from any page.
 *
 * Hidden on /ai, where the full-page version is already on screen — two copies
 * of the same conversation on one page would be confusing and would mount the
 * hook twice.
 */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setOpen(false), [pathname]);

  // `autoFocus` is deliberately off: the panel lazy-loads, so at open time the
  // only focusable thing inside it belongs to a loading state that is about to
  // be replaced. The composer takes focus itself once it mounts.
  useFocusTrap({ active: open, containerRef: panelRef, onClose: close });

  if (pathname === "/ai") return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask the AI assistant"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full",
          "border border-line bg-surface px-4 py-3 text-sm text-ink",
          "shadow-[var(--shadow-overlay)] transition-colors hover:bg-surface-raised",
        )}
      >
        <AlexLogo variant="icon" className="size-4 text-ink" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <button
              type="button"
              aria-label="Close assistant"
              tabIndex={-1}
              className="absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
              onClick={close}
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="AI assistant"
              className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-canvas shadow-[var(--shadow-overlay)] sm:max-w-lg"
              initial={reduced ? { opacity: 0 } : { x: "100%" }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
                <p className="flex items-center gap-2.5 text-sm font-medium text-ink">
                  <AlexLogo variant="icon" className="size-4 text-ink" />
                  Ask AI
                </p>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close assistant"
                  className="flex size-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>

              <ChatPanel autoFocus className="min-h-0 flex-1" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
