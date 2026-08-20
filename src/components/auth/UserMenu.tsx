"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { authClient, useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/**
 * The signed-in visitor's avatar and menu. Renders nothing for a signed-out
 * visitor — sign-in lives next to the actions that need it (the comment box,
 * via SignInButton/SignInPrompt), not in the header.
 *
 * Rendered in the header, which is a client component on every page — including
 * the statically prerendered ones. That is the whole reason the session is read
 * *here* rather than on the server: `headers()` in a page would opt every route
 * out of static rendering to draw one avatar. Fetching it client-side keeps the
 * HTML cacheable and keeps per-visitor state out of a shared cache.
 *
 * The consequence, accepted deliberately: the menu appears a moment after the
 * page does. It renders nothing at all until the session resolves rather than
 * flashing a sign-in button at someone who is already signed in, which is the
 * more jarring of the two.
 */

export function UserMenu() {
  const { data, isPending } = useSession();
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useFocusTrap({ active: open, containerRef: menuRef, onClose: close, autoFocus: true });

  // Nothing until we know. See the note above about the alternative.
  if (isPending) return <div className="size-8" aria-hidden />;

  // Signed-out visitors get no sign-in affordance in the header at all — it
  // stays where it's actually needed, next to the comment box (CommentForm)
  // and anywhere else a visitor is about to do something that requires it.
  // The header only ever shows the account menu, and only once there is an
  // account to show.
  if (!data?.user) return null;

  const user = data.user;
  // Present only because the customSession plugin computes it on the server.
  // It decides whether a link is drawn and nothing else — /admin re-derives the
  // same answer, and every admin API route derives it independently again.
  const isAdmin = "isAdmin" in user && user.isAdmin === true;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        className="flex rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={user.name} src={user.image} />
      </button>

      {open ? (
        <>
          {/* Click-away. Not focusable, so it never appears in the tab order. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="fixed inset-0 z-40 cursor-default"
            onClick={close}
          />

          <div
            ref={menuRef}
            role="menu"
            aria-label="Account"
            className={cn(
              "absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[var(--radius-lg)]",
              "border border-line bg-surface shadow-[var(--shadow-overlay)]",
            )}
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-subtle">{user.email}</p>
            </div>

            {isAdmin ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <Shield aria-hidden className="size-4" />
                Admin
              </Link>
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                close();
                await authClient.signOut();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
