"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 160;

/**
 * Message input. Grows with its content up to a cap, submits on Enter and
 * allows a newline with Shift+Enter — the convention users already expect from
 * chat interfaces.
 */
export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  autoFocus = false,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset to auto first so the height shrinks when text is deleted.
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
  }, [value, isStreaming, disabled, onSend]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="relative flex items-end gap-2 rounded-[var(--radius-lg)] border border-line bg-surface p-2 transition-colors focus-within:border-line-strong"
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about Alex
      </label>

      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about his experience, projects or stack…"
        className={cn(
          "min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed",
          "text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:outline-none",
          "disabled:opacity-60",
        )}
      />

      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <Square aria-hidden className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-accent-ink transition-opacity hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowUp aria-hidden className="size-4" />
        </button>
      )}
    </form>
  );
}
