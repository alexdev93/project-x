"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { AlexLogo } from "@/components/brand/AlexLogo";
import { aiConfig } from "@/content";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { ChatMessageItem } from "./ChatMessage";
import { Composer } from "./Composer";

/**
 * The assistant itself. Rendered both as a full page (/ai) and inside the
 * slide-over launcher, so the conversation logic exists in exactly one place.
 */
export function ChatPanel({
  className,
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const { messages, status, error, isStreaming, send, retry, stop, clear } =
    useChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Only auto-scroll while the user is already at the bottom. Yanking the view
  // down while they are reading earlier messages is worse than not scrolling.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottom.current = distance < 80;
  }, []);

  useEffect(() => {
    if (!pinnedToBottom.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
          {isEmpty ? (
            <EmptyState onPick={send} />
          ) : (
            messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1}
              />
            ))
          )}

          {error ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-accent/30 bg-accent-soft p-4"
            >
              <p className="flex items-start gap-2.5 text-sm text-accent">
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-accent/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent transition-colors hover:bg-accent/10"
              >
                <RotateCcw aria-hidden className="size-3" />
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-line bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6">
          <Composer
            onSend={send}
            onStop={stop}
            isStreaming={isStreaming}
            autoFocus={autoFocus}
          />

          <div className="mt-2.5 flex items-center justify-between gap-4">
            <p className="text-[11px] leading-snug text-ink-subtle">
              Answers come from Alex&apos;s portfolio content and may be
              imprecise.
            </p>

            {!isEmpty ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-ink-subtle transition-colors hover:text-ink"
              >
                <Trash2 aria-hidden className="size-3" />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Announces streaming state to screen readers without moving focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {status === "streaming" ? "Assistant is responding" : ""}
      </span>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-6 py-6">
      <div className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-raised">
        <AlexLogo variant="icon" className="size-5 text-ink" />
      </div>

      <div>
        <h2 className="font-display text-2xl text-ink sm:text-3xl">
          {aiConfig.greeting}
        </h2>
        <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
          {aiConfig.intro}
        </p>
      </div>

      <ul className="flex w-full flex-col gap-2">
        {aiConfig.suggestedPrompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="w-full rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-left text-sm text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
