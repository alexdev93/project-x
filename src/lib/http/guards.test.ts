import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The cross-origin and size checks.
 *
 * `sameOrigin` is the CSRF defence for every mutating route in the blog, so the
 * cases that matter are the ones an attacker would try: a foreign origin, no
 * origin at all, and a hostname that merely *contains* the site's.
 */

const SITE = "https://example.test";

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

async function load() {
  return import("./guards");
}

/**
 * `Request` does not let you set a Host header (it is a forbidden header name in
 * fetch), so tests that exercise the host comparison pass `x-forwarded-host`,
 * which is the header Vercel actually supplies in production.
 */
function request(headers: Record<string, string>, body = "{}") {
  return new Request(`${SITE}/api/blog/test`, {
    method: "POST",
    headers: { "x-forwarded-host": "example.test", ...headers },
    body,
  });
}

describe("sameOrigin", () => {
  it("accepts this site's own origin", async () => {
    const { sameOrigin } = await load();
    expect(sameOrigin(request({ origin: SITE }))).toBe(true);
    // Path and query on the Origin header are ignored by URL.origin.
    expect(sameOrigin(request({ origin: `${SITE}/somewhere` }))).toBe(true);
  });

  it("rejects a foreign origin", async () => {
    const { sameOrigin } = await load();
    expect(sameOrigin(request({ origin: "https://attacker.test" }))).toBe(false);
  });

  it("rejects a hostname that merely contains this one", async () => {
    const { sameOrigin } = await load();
    expect(sameOrigin(request({ origin: "https://example.test.attacker.test" }))).toBe(
      false,
    );
    expect(sameOrigin(request({ origin: "https://notexample.test" }))).toBe(false);
  });

  it("rejects a different port, which is a different origin", async () => {
    const { sameOrigin } = await load();
    expect(sameOrigin(request({ origin: "https://example.test:8443" }))).toBe(false);
  });

  it("accepts the host the request was actually sent to, not just the configured site", async () => {
    // The case that matters in production: a preview deployment's host differs
    // from the NEXT_PUBLIC_SITE_URL baked in at build time.
    const { sameOrigin } = await load();
    expect(
      sameOrigin(
        request({
          origin: "https://preview-abc123.vercel.app",
          "x-forwarded-host": "preview-abc123.vercel.app",
        }),
      ),
    ).toBe(true);
  });

  it("still accepts the configured site URL when the host header differs", async () => {
    const { sameOrigin } = await load();
    expect(
      sameOrigin(request({ origin: SITE, "x-forwarded-host": "internal.proxy" })),
    ).toBe(true);
  });

  it("rejects a missing or unparseable origin", async () => {
    const { sameOrigin } = await load();
    expect(sameOrigin(request({}))).toBe(false);
    expect(sameOrigin(request({ origin: "null" }))).toBe(false);
    expect(sameOrigin(request({ origin: "not a url" }))).toBe(false);
  });
});

describe("isJsonRequest", () => {
  it("accepts JSON with or without a charset", async () => {
    const { isJsonRequest } = await load();
    expect(isJsonRequest(request({ "content-type": "application/json" }))).toBe(true);
    expect(
      isJsonRequest(request({ "content-type": "application/json; charset=utf-8" })),
    ).toBe(true);
  });

  it("rejects the three content types an HTML form can send", async () => {
    const { isJsonRequest } = await load();
    // This is what makes a cross-site form post impossible without a token.
    for (const type of [
      "application/x-www-form-urlencoded",
      "multipart/form-data; boundary=x",
      "text/plain",
    ]) {
      expect(isJsonRequest(request({ "content-type": type })), type).toBe(false);
    }
    expect(isJsonRequest(request({}))).toBe(false);
  });
});

describe("withinSizeLimit", () => {
  it("allows a body under the cap and refuses one over it", async () => {
    const { withinSizeLimit } = await load();
    expect(withinSizeLimit(request({ "content-length": "1000" }), 2000)).toBe(true);
    expect(withinSizeLimit(request({ "content-length": "3000" }), 2000)).toBe(false);
  });

  it("allows a missing header, since the schema bounds are the real limit", async () => {
    const { withinSizeLimit } = await load();
    expect(withinSizeLimit(request({}), 2000)).toBe(true);
  });
});

describe("checkRequest", () => {
  it("rejects a cross-origin request before parsing anything", async () => {
    const { checkRequest } = await load();
    const result = await checkRequest(
      request({ origin: "https://attacker.test", "content-type": "application/json" }),
    );

    expect(result.response?.status).toBe(400);
    expect(result.body).toBeNull();
  });

  it("rejects a form-encoded request", async () => {
    const { checkRequest } = await load();
    const result = await checkRequest(
      request({ origin: SITE, "content-type": "application/x-www-form-urlencoded" }),
    );

    expect(result.response?.status).toBe(400);
  });

  it("returns the parsed body for a well-formed request", async () => {
    const { checkRequest } = await load();
    const result = await checkRequest(
      request({ origin: SITE, "content-type": "application/json" }, '{"body":"hi"}'),
    );

    expect(result.response).toBeNull();
    expect(result.body).toEqual({ body: "hi" });
  });

  it("rejects malformed JSON with a 400 rather than throwing", async () => {
    const { checkRequest } = await load();
    const result = await checkRequest(
      request({ origin: SITE, "content-type": "application/json" }, "{not json"),
    );

    expect(result.response?.status).toBe(400);
  });
});

describe("responses", () => {
  it("never cache, whatever the status", async () => {
    const { unauthorized, notFound, okResponse, errorResponse } = await load();

    for (const response of [
      unauthorized(),
      notFound(),
      okResponse({ ok: true }),
      errorResponse(429, "Slow down."),
    ]) {
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("mask a refusal as 404, so nothing is confirmed to exist", async () => {
    const { notFound } = await load();
    expect(notFound().status).toBe(404);
  });
});

describe("databaseError", () => {
  it("turns a unique violation into a field error on the slug", async () => {
    const { databaseError } = await load();
    const response = databaseError(Object.assign(new Error("dup"), { code: "23505" }), "test");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      fieldErrors: { slug: ["That slug is already taken."] },
    });
  });

  it("says nothing about any other database failure", async () => {
    const { databaseError } = await load();
    const response = databaseError(
      new Error('relation "posts" does not exist at line 3'),
      "test",
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    // No SQL, no table names, no stack — the same rule the AI route follows.
    expect(JSON.stringify(body)).not.toContain("posts");
    expect(JSON.stringify(body)).not.toContain("relation");
  });
});
