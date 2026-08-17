import { beforeEach, describe, expect, it } from "vitest";
import {
  cacheKey,
  cacheSize,
  clearCache,
  getCached,
  normaliseQuestion,
  setCached,
} from "./ai-cache";

const user = (content: string) => [{ role: "user", content }];

describe("normaliseQuestion", () => {
  it("ignores case, padding and trailing punctuation", () => {
    expect(normaliseQuestion("  Tell me about Alex?? ")).toBe(
      "tell me about alex",
    );
  });

  it("collapses internal whitespace", () => {
    expect(normaliseQuestion("what\n  is\tthis")).toBe("what is this");
  });
});

describe("cacheKey", () => {
  it("matches questions that differ only cosmetically", () => {
    expect(cacheKey(user("Tell me about Alex"))).toBe(
      cacheKey(user("  tell me about alex?  ")),
    );
  });

  it("distinguishes different questions", () => {
    expect(cacheKey(user("about alex"))).not.toBe(
      cacheKey(user("about kubernetes")),
    );
  });

  it("refuses to cache once there is history", () => {
    // A follow-up depends on the transcript, so a question-only key would
    // return an answer to the wrong conversation.
    expect(
      cacheKey([
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "and Kubernetes?" },
      ]),
    ).toBeNull();
  });

  it("refuses to cache an assistant-led or empty turn", () => {
    expect(cacheKey([{ role: "assistant", content: "hi" }])).toBeNull();
    expect(cacheKey(user("   "))).toBeNull();
  });
});

describe("cache storage", () => {
  beforeEach(clearCache);

  it("returns a stored answer with its sources", () => {
    const key = cacheKey(user("q"))!;
    setCached(key, {
      text: "answer",
      sources: [{ title: "Zemenawi CRM", type: "project", url: "/projects/x" }],
    });

    expect(getCached(key)).toEqual({
      text: "answer",
      sources: [{ title: "Zemenawi CRM", type: "project", url: "/projects/x" }],
    });
  });

  it("misses on an unknown key", () => {
    expect(getCached("nope")).toBeNull();
  });

  it("never stores an empty answer", () => {
    // Caching a failure would pin it for the whole TTL.
    const key = cacheKey(user("q"))!;
    setCached(key, { text: "   ", sources: [] });
    expect(getCached(key)).toBeNull();
    expect(cacheSize()).toBe(0);
  });

  it("evicts to stay bounded", () => {
    for (let i = 0; i < 260; i++) {
      setCached(`k${i}`, { text: `a${i}`, sources: [] });
    }
    expect(cacheSize()).toBeLessThanOrEqual(200);
  });
});
