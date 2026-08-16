"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; name: string }
  | { kind: "error"; message: string };

type FieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string[]>>;

const fieldClass =
  "w-full rounded-[var(--radius)] border border-line bg-surface px-3.5 py-2.5 text-base text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:border-accent focus:outline-none focus-visible:outline-none " +
  "disabled:opacity-60";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error?.length ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-accent">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const submitting = status.kind === "submitting";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    setStatus({ kind: "submitting" });
    setFieldErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setStatus({ kind: "success", name: result.name });
        form.reset();
        return;
      }

      setFieldErrors(result.fieldErrors ?? {});
      setStatus({
        kind: "error",
        message: result.error ?? "Something went wrong. Please try again.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not reach the server. Check your connection and retry.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-8"
      >
        <CheckCircle2 aria-hidden className="size-6 text-accent" />
        <div>
          <p className="font-display text-2xl text-ink">Message sent</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Thanks {status.name} — it landed. I&apos;ll reply to the address you
            gave, usually within a couple of days.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setStatus({ kind: "idle" })}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot. Hidden from sight and from assistive tech, but bots fill it. */}
      <div aria-hidden className="hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={fieldClass}
            placeholder="Your name"
          />
        </Field>

        <Field id="email" label="Email" error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={fieldClass}
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <Field id="subject" label="Subject" error={fieldErrors.subject}>
        <input
          id="subject"
          name="subject"
          required
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
          className={fieldClass}
          placeholder="What's this about?"
        />
      </Field>

      <Field id="message" label="Message" error={fieldErrors.message}>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          className={cn(fieldClass, "resize-y")}
          placeholder="A few sentences is plenty."
        />
      </Field>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting} className="self-start">
        {submitting ? (
          <>
            <Loader2 className="animate-spin" />
            Sending
          </>
        ) : (
          <>
            <Send />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
