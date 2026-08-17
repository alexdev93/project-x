import { describe, expect, it } from "vitest";
import { getCareerFacts } from "@/content";
import { getPortfolioContext } from "./context";

/**
 * The context is the assistant's whole view of the portfolio. These tests cover
 * the parts where a silent omission would produce a confidently wrong answer
 * rather than an obvious failure.
 */
describe("portfolio context", () => {
  const context = getPortfolioContext();

  it("covers every content area", () => {
    for (const heading of [
      "## Identity",
      "## Focus areas",
      "## Career totals",
      "## Experience",
      "## Projects",
      "## Technical skills",
      "## Education and training",
      "## Contact",
    ]) {
      expect(context).toContain(heading);
    }
  });

  it("states the pre-computed career totals the site itself displays", () => {
    // Regression: without these the model did its own arithmetic over the
    // overlapping date ranges and answered "about 5 years" while the homepage
    // stat block said 6+. Both surfaces must read one derivation.
    for (const fact of getCareerFacts()) {
      expect(context).toContain(`${fact.label}: ${fact.value}`);
    }
  });

  it("tells the model not to recompute those totals from the dates", () => {
    expect(context).toMatch(/do not\s+recompute them from the dates/i);
  });

  it("is memoised rather than rebuilt per request", () => {
    expect(getPortfolioContext()).toBe(context);
  });

  it("carries no secrets", () => {
    expect(context).not.toMatch(/AIzaSy|postgres(?:ql)?:\/\/|GEMINI_API_KEY/i);
  });
});
