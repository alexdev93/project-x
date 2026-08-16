/**
 * The seam between the assistant and whatever model is behind it.
 *
 * Everything above this file — the route handler, the prompt, the UI — depends
 * only on this interface. Swapping Gemini for another provider means adding one
 * implementation and changing one line in ./index.ts; nothing else moves.
 */

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type StreamReplyInput = {
  /** System instruction, already composed with the grounding context. */
  system: string;
  /** Conversation so far, oldest first. The last entry is the new question. */
  messages: ChatMessage[];
  /** Aborts the upstream request when the client disconnects. */
  signal?: AbortSignal;
};

export interface ChatProvider {
  /** Stable identifier, used in logs and error reporting. */
  readonly id: string;

  /**
   * Streams the reply as plain text chunks. Implementations must not buffer
   * the whole response — the point is that the first token reaches the user
   * quickly.
   */
  streamReply(input: StreamReplyInput): ReadableStream<string>;
}

/** Thrown when a provider is asked to run without the configuration it needs. */
export class ProviderNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`AI provider is not configured: ${missing} is missing.`);
    this.name = "ProviderNotConfiguredError";
  }
}
