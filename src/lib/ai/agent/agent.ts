import { streamText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAiConfig } from "@/lib/ai/config";
import { getSystemPrompt } from "@/lib/ai/prompts/portfolio";
import { retrieve } from "@/lib/rag/retrieval";
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
   * Resolves to the citations for this turn. Await it after the stream drains.
   *
   * Retrieval runs unconditionally on the question rather than only when the
   * model calls searchKnowledge. Live testing showed why: the full corpus is
   * already in the system prompt, so the model rarely has a reason to search,
   * and citations almost never appeared. Since retrieval's job here is
   * attribution rather than context selection, tying it to a tool the model
   * elects to use was the wrong shape.
   *
   * It is kicked off before generation and awaited after, so its ~200ms overlaps
   * the model's own latency and adds nothing to time-to-first-token.
   */
  sources: Promise<Source[]>;
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

  // Kicked off before generation so its latency overlaps the model's. Only the
  // latest user turn is used as the query — a follow-up should be attributed to
  // what it actually asks about, not to the whole transcript.
  const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const retrieval = retrieve(question).then((r) => r.sources).catch(() => []);

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

  // Merge both channels: whatever unconditional retrieval found, plus anything
  // the model surfaced by calling searchKnowledge itself. `collector` dedupes.
  const sources = (async () => {
    collector.add(await retrieval);
    return collected;
  })();

  return { stream: result.textStream, sources };
}
