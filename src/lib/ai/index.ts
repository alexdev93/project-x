import { createGeminiProvider } from "./gemini";
import type { ChatProvider } from "./provider";

/**
 * Selects the active chat provider.
 *
 * This is the swap point: to move off Gemini, add a sibling implementation of
 * ChatProvider and return it here. No caller changes.
 */

let provider: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  provider ??= createGeminiProvider();
  return provider;
}

export { ProviderNotConfiguredError } from "./provider";
export type { ChatMessage, ChatProvider, ChatRole } from "./provider";
export { getSystemPrompt } from "./prompt";
