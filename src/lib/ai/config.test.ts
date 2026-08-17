import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getGeminiApiKey, misnamedKeyHint } from "./config";

/**
 * Key resolution and its diagnostics.
 *
 * A missing key and a misnamed one produce the same 503, which cost a round trip
 * to work out from a hosting dashboard. These pin the behaviour that makes the
 * difference visible in the logs.
 */

const NAMES = [
  "GEMINI_API_KEY",
  "GEMINI_KEY",
  "GEMINI_API",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "NEXT_PUBLIC_GEMINI_API_KEY",
];

describe("getGeminiApiKey", () => {
  beforeEach(() => {
    for (const name of NAMES) delete process.env[name];
  });
  afterEach(() => {
    for (const name of NAMES) delete process.env[name];
  });

  it("returns the key when set", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(getGeminiApiKey()).toBe("test-key");
  });

  it("trims padding a dashboard paste leaves behind", () => {
    // A trailing newline would otherwise reach the provider and fail auth with a
    // far less obvious error than "not configured".
    process.env.GEMINI_API_KEY = "  test-key\n";
    expect(getGeminiApiKey()).toBe("test-key");
  });

  it("treats a whitespace-only value as absent", () => {
    process.env.GEMINI_API_KEY = "   ";
    expect(getGeminiApiKey()).toBeUndefined();
  });

  it("is undefined when unset", () => {
    expect(getGeminiApiKey()).toBeUndefined();
  });
});

describe("misnamedKeyHint", () => {
  beforeEach(() => {
    for (const name of NAMES) delete process.env[name];
  });
  afterEach(() => {
    for (const name of NAMES) delete process.env[name];
  });

  it("says nothing when no near-miss is set", () => {
    expect(misnamedKeyHint()).toBeUndefined();
  });

  it("names the wrong variable and the fix", () => {
    process.env.GEMINI_KEY = "test-key";
    const hint = misnamedKeyHint();

    expect(hint).toContain("GEMINI_KEY");
    expect(hint).toContain("GEMINI_API_KEY");
    expect(hint).toMatch(/redeploy/i);
  });

  it("catches each alias it claims to check", () => {
    for (const alias of NAMES.filter((n) => n !== "GEMINI_API_KEY")) {
      process.env[alias] = "test-key";
      expect(misnamedKeyHint()).toContain(alias);
      delete process.env[alias];
    }
  });

  it("never includes the value, only the name", () => {
    process.env.GEMINI_KEY = "AIzaSyExampleSecretValue";
    expect(misnamedKeyHint()).not.toContain("AIzaSyExampleSecretValue");
  });

  it("ignores a variable that is only whitespace", () => {
    process.env.GEMINI_KEY = "  ";
    expect(misnamedKeyHint()).toBeUndefined();
  });
});
