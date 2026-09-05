"use client";

import React, { useState } from "react";
import { Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { linkLinkedIn, unlinkLinkedIn } from "@/lib/auth/client";

/**
 * Connect/disconnect control for the LinkedIn account a published post gets
 * shared to. Lives on the admin overview page — this is a one-time setup
 * action for the owner, not something that needs its own settings page.
 */
export function LinkedInConnection({
  connected,
  accountId,
}: {
  connected: boolean;
  /** Better Auth's row id for the linked account. Required to disconnect. */
  accountId?: string;
}) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");

  async function connect() {
    setState("pending");
    const { error } = await linkLinkedIn("/admin");
    // On success the browser navigates away to LinkedIn's consent screen, so
    // there is nothing left to reset here.
    if (error) setState("error");
  }

  async function disconnect() {
    if (!accountId) return;
    setState("pending");
    const { error } = await unlinkLinkedIn(accountId);
    setState(error ? "error" : "idle");
    if (!error) window.location.reload();
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">LinkedIn</p>
        <p className="mt-1 text-sm text-ink-muted">
          {connected
            ? "Connected. A new post you publish is also shared here."
            : "Not connected. Publishing a post won't share it anywhere."}
        </p>
        {state === "error" ? (
          <p role="alert" className="mt-1 text-sm text-accent">
            That didn&apos;t work. Please try again.
          </p>
        ) : null}
      </div>

      <Button
        variant={connected ? "secondary" : "primary"}
        size="sm"
        disabled={state === "pending"}
        onClick={connected ? disconnect : connect}
      >
        {state === "pending" ? (
          <Loader2 className="animate-spin" />
        ) : connected ? (
          <Unlink />
        ) : (
          <Link2 />
        )}
        {connected ? "Disconnect" : "Connect LinkedIn"}
      </Button>
    </div>
  );
}
