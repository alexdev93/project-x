"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/useChat";
import { Markdown } from "./Markdown";
import { CopyButton } from "./CodeBlock";
import { MessageSources } from "./MessageSources";

/** Three animated dots shown while the first token is still in flight. */
export function TypingIndicator() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      className="flex items-center gap-1 py-1"
      role="status"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-1.5 rounded-full bg-ink-subtle"
          animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function ChatMessageItem({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      {isUser ? (
        <div className="max-w-[85%] rounded-[var(--radius-lg)] rounded-br-sm border border-line bg-surface-raised px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          {message.content}
        </div>
      ) : (
        <div className="group w-full max-w-full">
          {message.content ? (
            <>
              <Markdown content={message.content} />

              {/* Citations appear only once the stream has settled — they
                  arrive after the answer text, so showing them mid-stream
                  would make them pop in and out. */}
              {!isStreaming && message.sources?.length ? (
                <MessageSources sources={message.sources} />
              ) : null}

              {!isStreaming ? (
                <CopyButton
                  value={message.content}
                  label="Copy"
                  className="mt-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <TypingIndicator />
          )}
        </div>
      )}
    </motion.div>
  );
}
