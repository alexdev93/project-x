"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signInWithGoogle } from "@/lib/auth/client";

/**
 * Google sign-in.
 *
 * The Google mark is inlined as SVG rather than fetched, both because the CSP
 * posture of this site is to load nothing from third parties and because a button
 * whose icon arrives late looks broken. It is Google's four-colour "G", drawn at
 * the official proportions, which their brand guidelines require for a
 * "Sign in with Google" affordance.
 *
 * A failed sign-in leaves the button in an error state rather than throwing.
 * Better Auth returns 503 when the deployment has no credentials configured, and
 * a visitor should see "sign-in isn't available" instead of a blank page.
 */

export function SignInButton({
  callbackURL,
  label = "Sign in with Google",
  size = "md",
  className,
}: {
  /** Where to land after the round trip. Same-origin paths only; see the client. */
  callbackURL?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");

  async function start() {
    setState("pending");
    try {
      await signInWithGoogle(callbackURL);
      // On success the browser navigates away, so there is nothing to reset.
    } catch {
      setState("error");
    }
  }

  return (
    <div className={className}>
      <Button
        variant="secondary"
        size={size}
        onClick={start}
        disabled={state === "pending"}
      >
        {state === "pending" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleMark />
        )}
        {label}
      </Button>

      {state === "error" ? (
        <p role="alert" className="mt-2 text-sm text-accent">
          Sign-in isn&apos;t available right now. Please try again later.
        </p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.29-1.71V4.95H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.17 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
