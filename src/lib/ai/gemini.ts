import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  ProviderNotConfiguredError,
  type ChatProvider,
  type StreamReplyInput,
} from "./provider";

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Gemini implementation of ChatProvider.
 *
 * This is the only file that knows the provider is Google. The API key is read
 * here, on the server, and is never referenced from a client component or a
 * NEXT_PUBLIC_ variable.
 */
export function createGeminiProvider(): ChatProvider {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ProviderNotConfiguredError("GEMINI_API_KEY");
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const modelId = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  return {
    id: `google:${modelId}`,

    streamReply({ system, messages, signal }: StreamReplyInput) {
      const result = streamText({
        model: google(modelId),
        system,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        abortSignal: signal,
        // Low enough to keep answers grounded and repeatable, high enough that
        // they do not read like a lookup table.
        temperature: 0.4,
        maxOutputTokens: 1024,
      });

      return result.textStream;
    },
  };
}
