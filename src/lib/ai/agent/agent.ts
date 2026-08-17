import { streamText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAiConfig } from "@/lib/ai/config";
import { getSystemPrompt } from "@/lib/ai/prompts/portfolio";
import type { Source } from "@/lib/rag/types";
import { createTools } from "./tools";
import type { ChatMessage } from "./types";

/**
 * The agent.
 *
 * Not a passthrough to the model: it is given tools and allowed several steps,
 * so it can look something up, read the result, and look up more before
 * answering. "Which project best demonstrates backend experience" needs exactly
 * that — list projects, inspect the promising ones, then compare.
 *
 * The step budget is small and finite. Portfolio questions resolve in one or two
 * lookups; a higher ceiling would only let a confused turn burn free-tier quota.
 */

const MAX_STEPS = 5;

export type AgentRun = {
  /** Answer text as it is produced. Typed structurally so the agent's public
   *  surface does not depend on the SDK's generic signature. */
  stream: AsyncIterable<string>;
  /**
   * Sources gathered during the run. Populated as tools execute, so read this
   * only after the stream is done.
   */
  sources: Source[];
};

export function runAgent({
  messages,
  signal,
}: {
  messages: ChatMessage[];
  signal?: AbortSignal;
}): AgentRun {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const config = getAiConfig();
  const google = createGoogleGenerativeAI({ apiKey });

  // Mutated by the tools as they run; the route serialises it once the stream
  // finishes, so citations reflect what was actually consulted.
  const collected: Source[] = [];
  const seen = new Set<string>();
  const collector = {
    add: (sources: Source[]) => {
      for (const source of sources) {
        const key = source.url ?? source.title;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(source);
      }
    },
  };

  const result = streamText({
    model: google(config.model),
    system: getSystemPrompt(),
    messages: messages.map(({ role, content }) => ({ role, content })),
    tools: createTools(collector),
    stopWhen: stepCountIs(MAX_STEPS),
    abortSignal: signal,
    // Low enough to keep answers grounded and repeatable, high enough that they
    // do not read like a lookup table.
    temperature: 0.4,
    maxOutputTokens: 1024,
    onError: ({ error }) => {
      // Logged server-side only; the route decides what the user sees.
      console.error("Agent stream error:", error);
    },
  });

  return { stream: result.textStream, sources: collected };
}
