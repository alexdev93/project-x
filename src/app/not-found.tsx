import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-subtle">
        404
      </p>
      <h1 className="mt-6 font-display text-4xl leading-tight text-ink sm:text-5xl">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ink-muted">
        The link may be out of date, or the page may have moved.
      </p>
      <Link href="/" className="mt-8">
        <Button variant="secondary">
          <ArrowLeft />
          Back home
        </Button>
      </Link>
    </Container>
  );
}
