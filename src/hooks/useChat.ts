"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseSources } from "@/lib/ai/agent/types";
import type { Source } from "@/lib/rag/types";

export type ChatRole = "user" | "assistant";

export type Message = {
  id: string;
  role: ChatRole;
  content: string;
  /** Portfolio content the answer drew on. Assistant messages only. */
  sources?: Source[];
};

export type ChatStatus = "idle" | "streaming" | "error";

const STORAGE_KEY = "portfolio-chat-history";
const MAX_PERSISTED = 30;

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Message =>
        item &&
        typeof item.id === "string" &&
        typeof item.content === "string" &&
        (item.role === "user" || item.role === "assistant"),
    );
  } catch {
    // Corrupt or unavailable storage should never break the chat.
    return [];
  }
}

/**
 * Conversation state for the assistant.
 *
 * Owns the network call, the streaming read loop, cancellation and history
 * persistence. The UI components below it stay presentational.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // Kept in a ref so send() does not need `messages` as a dependency, which
  // would recreate the callback on every streamed chunk.
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;

  useEffect(() => {
    setMessages(loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_PERSISTED)),
      );
    } catch {
      // Storage full or blocked — the conversation still works in memory.
    }
  }, [messages, hydrated]);

  // Cancel any in-flight request if the component unmounts mid-stream.
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (history: Message[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setError(null);

    const replyId = createId();
    setMessages([...history, { id: replyId, role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(
          detail?.error ?? "The assistant couldn't answer that. Please try again.",
        );
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;

        // The citation tail is stripped on every tick, so a partially received
        // sentinel is never shown to the user as literal text.
        const { text, sources } = parseSources(buffer);
        setMessages((current) =>
          current.map((message) =>
            message.id === replyId
              ? { ...message, content: text, sources }
              : message,
          ),
        );
      }

      if (!parseSources(buffer).text.trim()) {
        throw new Error("The assistant returned an empty response.");
      }

      setStatus("idle");
    } catch (caught) {
      // An abort is a user action (stop or clear), not a failure.
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setStatus("idle");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
      setStatus("error");
      // Drop the empty placeholder so no blank bubble is left behind.
      setMessages((current) =>
        current.filter((message) => message.id !== replyId || message.content),
      );
    } finally {
      abortRef.current = null;
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content) return;

      const history: Message[] = [
        ...messagesRef.current.filter((message) => message.content),
        { id: createId(), role: "user", content },
      ];

      void run(history);
    },
    [run],
  );

  /** Re-asks the last question, discarding the answer that failed. */
  const retry = useCallback(() => {
    const history = [...messagesRef.current];
    while (history.length > 0 && history[history.length - 1].role === "assistant") {
      history.pop();
    }
    if (history.length === 0) return;
    void run(history);
  }, [run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStatus("idle");
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do — in-memory state is already cleared.
    }
  }, []);

  return {
    messages,
    status,
    error,
    hydrated,
    isStreaming: status === "streaming",
    send,
    retry,
    stop,
    clear,
  };
}
