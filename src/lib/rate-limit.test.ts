import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "./rate-limit";

/** Unique prefix per test so the shared module-level store cannot bleed. */
let n = 0;
const key = () => `test-${n++}`;

describe("rateLimit", () => {
  const config = { limit: 3, windowMs: 60_000 };

  it("allows requests up to the limit", () => {
    const k = key();
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(k, config).allowed).toBe(true);
    }
  });

  it("blocks past the limit", () => {
    const k = key();
    for (let i = 0; i < 3; i++) rateLimit(k, config);
    expect(rateLimit(k, config).allowed).toBe(false);
  });

  it("counts each client separately", () => {
    const a = key();
    const b = key();
    for (let i = 0; i < 3; i++) rateLimit(a, config);

    expect(rateLimit(a, config).allowed).toBe(false);
    expect(rateLimit(b, config).allowed).toBe(true);
  });

  it("reports remaining allowance", () => {
    const k = key();
    expect(rateLimit(k, config).remaining).toBe(2);
    expect(rateLimit(k, config).remaining).toBe(1);
    expect(rateLimit(k, config).remaining).toBe(0);
  });

  it("returns a positive Retry-After once blocked", () => {
    const k = key();
    for (let i = 0; i < 4; i++) rateLimit(k, config);
    expect(rateLimit(k, config).retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts a fresh window after the old one expires", () => {
    const k = key();
    const short = { limit: 1, windowMs: 1 };
    expect(rateLimit(k, short).allowed).toBe(true);

    const until = Date.now() + 5;
    while (Date.now() < until) {
      /* let the window lapse */
    }
    expect(rateLimit(k, short).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers });

  it("uses the leftmost forwarded address", () => {
    // The left-most entry is the original client; later ones are proxies.
    expect(
      clientKey(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), "ai"),
    ).toBe("ai:203.0.113.7");
  });

  it("namespaces by prefix so endpoints do not share a budget", () => {
    const headers = { "x-forwarded-for": "203.0.113.7" };
    expect(clientKey(request(headers), "ai")).not.toBe(
      clientKey(request(headers), "contact"),
    );
  });

  it("falls back to a shared bucket when the header is absent", () => {
    // Fails closed (stricter) rather than handing anonymous callers no limit.
    expect(clientKey(request({}), "ai")).toBe("ai:unknown");
  });
});
