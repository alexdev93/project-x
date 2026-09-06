import React from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SignInButton } from "@/components/auth/SignInButton";

/**
 * The one page on the site whose entire job is offering a sign-in button
 * outside the context of a specific action (a comment, admin).
 *
 * Exists because `/admin` has no content to show an anonymous visitor — the
 * layout 404s anyone who isn't the owner, and it cannot tell "anonymous" from
 * "signed in as someone else" apart without a real session to check, so it
 * cannot safely render a sign-in prompt itself. Middleware redirects here
 * instead, before any of that rendering happens, and this page hands the
 * visitor back to wherever they were trying to go via `callbackURL`.
 */

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage(
  props: {
    searchParams: Promise<{ callbackURL?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
          Sign in
        </p>
        <h1 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
          Continue with Google
        </h1>
        <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-ink-muted">
          Only needed to reach the admin area or leave a comment as yourself.
        </p>
      </div>

      <SignInButton callbackURL={searchParams.callbackURL} />
    </Container>
  );
}
