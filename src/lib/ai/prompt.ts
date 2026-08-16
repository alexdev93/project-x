import { aiConfig, profile } from "@/content";
import { getPortfolioContext } from "./context";

/**
 * Composes the system instruction: who the assistant is, how it should behave,
 * and the grounding context it may draw on.
 *
 * The behaviour rules come from src/content/ai.json so the assistant's voice is
 * editable alongside the rest of the content, not buried in code.
 */
function buildSystemPrompt(): string {
  return [
    `You are the assistant on ${profile.name}'s portfolio site. Visitors are usually recruiters, hiring managers or engineers evaluating his work.`,
    "",
    `Voice: ${aiConfig.persona.voice}`,
    "",
    "Rules:",
    ...aiConfig.persona.rules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "When referring to a project, link it with its path (for example [Zemenawi CRM](/projects/zemenawi-crm)) so the visitor can open the case study.",
    "",
    "The following is everything you know about him. Treat it as the complete record.",
    "",
    "=== PORTFOLIO CONTEXT ===",
    getPortfolioContext(),
    "=== END PORTFOLIO CONTEXT ===",
  ].join("\n");
}

let cached: string | null = null;

export function getSystemPrompt(): string {
  cached ??= buildSystemPrompt();
  return cached;
}
