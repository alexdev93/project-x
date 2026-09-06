"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useSession, signInWithGoogle, signInWithGooglePopup } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/**
 * The like button.
 *
 * ## Why the viewer's own state is fetched rather than rendered
 *
 * The post page is cached HTML shared by every reader, so the *count* can be
 * server-rendered but "did **you** like this" cannot — putting a per-visitor
 * value in shared markup is the quietest possible way to show one reader another
 * reader's state. So the count arrives as a prop and the liked flag arrives from
 * a fetch on mount.
 *
 * ## Optimistic, but reconciled
 *
 * A tap flips the heart immediately and then takes the server's answer as
 * final — the endpoint returns the authoritative state from `RETURNING active`,
 * so a double tap, a slow network or two tabs cannot leave the button
 * disagreeing with the database. On failure it rolls back to what it had.
 *
 * A signed-out reader sees a real button that starts sign-in, rather than a
 * disabled one: "you can't do this" is a worse answer than "here is how".
 *
 * ## Sign-in happens in place
 *
 * `toggle()` opens Google sign-in in a popup rather than redirecting the
 * whole page: the post stays exactly where it was, and the moment the popup
 * closes with a session, this same click's intent (`like()`) runs
 * immediately, with no second tap required. A blocked popup falls back to
 * the classic full-page redirect, which is the only path that still needs a
 * `callbackURL` back to this post.
 */

export function LikeButton({
  slug,
  initialCount,
}: {
  slug: string;
  /** Server-rendered from the cached page. Slightly stale is fine. */
  initialCount: number;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  const signedIn = Boolean(session?.user);

  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only a signed-in reader can have liked anything, so this is skipped
  // entirely for everyone else — one fewer request on the common path.
  useEffect(() => {
    if (!signedIn) {
      setLiked(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/blog/posts/${slug}/likes`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled || !result.success) return;
        setLiked(result.liked);
        setCount(result.count);
      })
      .catch(() => {
        // A failed read leaves the server-rendered count in place, which is the
        // right fallback: the button still works, it just does not know yet
        // whether this reader had already liked the post.
      });

    return () => {
      cancelled = true;
    };
  }, [slug, signedIn]);

  async function toggle() {
    if (!signedIn) {
      setBusy(true);
      setError(null);

      const { error: signInError, blocked, cancelled } = await signInWithGooglePopup();

      if (signInError) {
        setBusy(false);
        if (cancelled) return;
        if (blocked) {
          // The browser blocked the popup — fall back to a full-page
          // redirect, returning to this exact post afterwards.
          await signInWithGoogle(`/blog/${slug}`);
          return;
        }
        setError("Couldn't sign you in. Please try again.");
        return;
      }

      // Signed in without leaving the page — finish what the click was for.
      await like();
      return;
    }

    await like();
  }

  async function like() {
    const previous = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/posts/${slug}/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (!result.success) {
        setLiked(previous.liked);
        setCount(previous.count);
        setError(result.error ?? "That didn't work.");
        return;
      }

      // The server's answer wins over the optimistic guess.
      setLiked(result.liked);
      setCount(result.count);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || sessionPending}
        aria-pressed={signedIn ? liked : undefined}
        aria-label={
          signedIn
            ? liked
              ? "Unlike this post"
              : "Like this post"
            : "Sign in to like this post"
        }
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-full border px-4 py-2",
          "text-sm transition-colors disabled:opacity-60",
          liked
            ? "border-accent/30 bg-accent-soft text-accent"
            : "border-line text-ink-muted hover:border-line-strong hover:bg-surface-raised hover:text-ink",
        )}
      >
        <Heart
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-200",
            liked ? "fill-current" : "group-hover:scale-110",
          )}
        />
        <span className="tabular-nums">{count}</span>
        <span className="sr-only">{count === 1 ? "like" : "likes"}</span>
      </button>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
