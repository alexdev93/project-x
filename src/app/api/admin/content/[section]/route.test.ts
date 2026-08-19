import { beforeEach, describe, expect, it, vi } from "vitest";
/**
 * The site's real profile document, used as the "valid" fixture. Using the
 * actual file rather than a hand-written one means these tests fail if the
 * schema and the content ever diverge — the same failure the build would hit,
 * caught here instead.
 */
import validProfile from "@/content/profile.json";

/**
 * The content editor's endpoint.
 *
 * One property matters more than the rest and is asserted several ways: **an
 * invalid document never reaches GitHub.** If it did, the repository would carry
 * a commit that breaks the next build, and the person who made it would find out
 * from a deployment log rather than from the form they were using.
 */

const requireAdmin = vi.hoisted(() => vi.fn());
const readContentFile = vi.hoisted(() => vi.fn());
const commitContentFile = vi.hoisted(() => vi.fn());
const canCommitContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireAdmin }));
vi.mock("@/lib/content-editor/github", () => ({
  readContentFile,
  commitContentFile,
  canCommitContent,
  missingContentEditorVars: () => ["GITHUB_TOKEN"],
  ContentEditorNotConfiguredError: class extends Error {},
}));

const SITE = "https://example.test";

beforeEach(() => {
  vi.resetModules();
  requireAdmin.mockReset();
  readContentFile.mockReset();
  commitContentFile.mockReset();
  canCommitContent.mockReset().mockReturnValue(true);
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});

async function load() {
  return import("./route");
}

const admin = () => ({
  ok: true,
  user: { id: "owner", name: "Owner", email: "owner@example.test", isAdmin: true },
});

function put(body: unknown, section = "profile") {
  return new Request(`${SITE}/api/admin/content/${section}`, {
    method: "PUT",
    headers: {
      origin: SITE,
      "x-forwarded-host": "example.test",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("authorization", () => {
  it("refuses a non-administrator without reading or writing anything", async () => {
    requireAdmin.mockResolvedValue({ ok: false, status: 404 });
    const { GET, PUT } = await load();

    const read = await GET(new Request(`${SITE}/api/admin/content/profile`), {
      params: { section: "profile" },
    });
    const write = await PUT(put({ data: validProfile, sha: "abc" }), {
      params: { section: "profile" },
    });

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
    expect(readContentFile).not.toHaveBeenCalled();
    expect(commitContentFile).not.toHaveBeenCalled();
  });

  it("404s an unknown section rather than guessing a path", async () => {
    requireAdmin.mockResolvedValue(admin());
    const { PUT } = await load();

    const response = await PUT(put({ data: {}, sha: "abc" }, "../../secrets"), {
      params: { section: "../../secrets" },
    });

    expect(response.status).toBe(404);
    expect(commitContentFile).not.toHaveBeenCalled();
  });
});

describe("validation before committing", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(admin());
    commitContentFile.mockResolvedValue({ sha: "c0ffee", url: "https://example.test/c" });
  });

  it("rejects a document that would fail the build, and does not commit", async () => {
    const { PUT } = await load();

    const response = await PUT(
      put({ data: { name: "", role: 42 }, sha: "abc" }),
      { params: { section: "profile" } },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.issues.length).toBeGreaterThan(0);
    // The assertion this whole file exists for.
    expect(commitContentFile).not.toHaveBeenCalled();
  });

  it("names the offending fields, so the error is actionable", async () => {
    const { PUT } = await load();

    const body = await (
      await PUT(put({ data: { ...validProfile, email: "not-an-email" }, sha: "abc" }), {
        params: { section: "profile" },
      })
    ).json();

    expect(body.issues.join(" ")).toContain("email");
  });

  it("rejects an object where the section expects an array", async () => {
    const { PUT } = await load();

    const response = await PUT(put({ data: { not: "an array" }, sha: "abc" }, "projects"), {
      params: { section: "projects" },
    });

    expect(response.status).toBe(400);
    expect(commitContentFile).not.toHaveBeenCalled();
  });

  it("commits a valid document, attributed to whoever saved it", async () => {
    const { PUT } = await load();

    const response = await PUT(put({ data: validProfile, sha: "abc" }), {
      params: { section: "profile" },
    });

    expect(response.status).toBe(200);
    const [arg] = commitContentFile.mock.calls[0];
    expect(arg.file).toBe("src/content/profile.json");
    expect(arg.sha).toBe("abc");
    expect(arg.author).toMatchObject({ email: "owner@example.test" });
  });

  it("requires the blob SHA, so a save cannot clobber a newer version", async () => {
    const { PUT } = await load();

    const response = await PUT(put({ data: validProfile }), {
      params: { section: "profile" },
    });

    expect(response.status).toBe(400);
    expect(commitContentFile).not.toHaveBeenCalled();
  });
});

describe("failure handling", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(admin());
  });

  it("passes on the stale-file conflict, which a person can act on", async () => {
    commitContentFile.mockRejectedValue(
      new Error("This file changed since you opened it. Reload and reapply your edit."),
    );
    const { PUT } = await load();

    const response = await PUT(put({ data: validProfile, sha: "old" }), {
      params: { section: "profile" },
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("changed since");
  });

  it("says nothing specific about any other GitHub failure", async () => {
    commitContentFile.mockRejectedValue(new Error("GitHub write failed (401)"));
    const { PUT } = await load();

    const response = await PUT(put({ data: validProfile, sha: "abc" }), {
      params: { section: "profile" },
    });
    const text = JSON.stringify(await response.json());

    expect(response.status).toBe(502);
    // A 401 from GitHub means the token is wrong, which is not a visitor's
    // business — and the status alone would hint at credentials.
    expect(text).not.toContain("401");
    expect(text).not.toContain("token");
  });

  it("degrades to 503 when the editor is not configured", async () => {
    canCommitContent.mockReturnValue(false);
    const { GET } = await load();

    const response = await GET(new Request(`${SITE}/api/admin/content/profile`), {
      params: { section: "profile" },
    });

    expect(response.status).toBe(503);
    expect(readContentFile).not.toHaveBeenCalled();
  });
});
