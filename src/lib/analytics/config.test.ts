import { afterEach, describe, expect, it, vi } from "vitest";
import { getPostHogHost, getPostHogKey, hasAnalytics } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPostHogKey", () => {
  it("is undefined when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    expect(getPostHogKey()).toBeUndefined();
  });

  it("trims the value", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "  phc_abc123  ");
    expect(getPostHogKey()).toBe("phc_abc123");
  });

  it("treats a whitespace-only value as unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "   ");
    expect(getPostHogKey()).toBeUndefined();
  });
});

describe("getPostHogHost", () => {
  it("defaults to PostHog's US cloud", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    expect(getPostHogHost()).toBe("https://us.i.posthog.com");
  });

  it("honours an explicit region, e.g. the EU cloud", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
    expect(getPostHogHost()).toBe("https://eu.i.posthog.com");
  });
});

describe("hasAnalytics", () => {
  it("is false with no key configured", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    expect(hasAnalytics()).toBe(false);
  });

  it("is true once a key is set", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_abc123");
    expect(hasAnalytics()).toBe(true);
  });
});
