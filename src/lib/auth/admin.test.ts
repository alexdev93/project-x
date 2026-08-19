import { describe, expect, it } from "vitest";
import { hasAdmins, isAdmin, isAdminEmail, parseAdminEmails } from "./admin";

/**
 * The privilege boundary. Every test here is a security property, not a
 * convenience — in particular the substring case, which is the specific bug an
 * `includes()` implementation would ship.
 */

const OWNER = "owner@example.com";

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases", () => {
    expect(parseAdminEmails(" Owner@Example.com , second@example.com ")).toEqual(
      new Set(["owner@example.com", "second@example.com"]),
    );
  });

  it("treats unset, empty and comma-only values as nobody", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
    expect(parseAdminEmails("   ").size).toBe(0);
    expect(parseAdminEmails(",,").size).toBe(0);
  });
});

describe("isAdminEmail", () => {
  it("matches the allowlisted address regardless of case or padding", () => {
    expect(isAdminEmail(OWNER, OWNER)).toBe(true);
    expect(isAdminEmail("OWNER@EXAMPLE.COM", OWNER)).toBe(true);
    expect(isAdminEmail("  owner@example.com  ", OWNER)).toBe(true);
  });

  it("rejects an address that merely contains an allowlisted one", () => {
    // The `includes()` bug: every one of these would pass a substring check.
    expect(isAdminEmail("owner@example.com.attacker.test", OWNER)).toBe(false);
    expect(isAdminEmail("notowner@example.com", OWNER)).toBe(false);
    expect(isAdminEmail("owner@example.co", OWNER)).toBe(false);
    expect(isAdminEmail("xowner@example.comx", OWNER)).toBe(false);
  });

  it("fails closed with no allowlist configured", () => {
    expect(isAdminEmail(OWNER, undefined)).toBe(false);
    expect(isAdminEmail(OWNER, "")).toBe(false);
  });

  it("rejects absent addresses", () => {
    expect(isAdminEmail(null, OWNER)).toBe(false);
    expect(isAdminEmail(undefined, OWNER)).toBe(false);
    expect(isAdminEmail("", OWNER)).toBe(false);
  });

  it("handles a multi-entry allowlist", () => {
    const list = "first@example.com,second@example.com";
    expect(isAdminEmail("second@example.com", list)).toBe(true);
    expect(isAdminEmail("third@example.com", list)).toBe(false);
  });
});

describe("isAdmin", () => {
  it("requires a verified address as well as the allowlist", () => {
    expect(isAdmin({ email: OWNER, emailVerified: true }, OWNER)).toBe(true);
    expect(isAdmin({ email: OWNER, emailVerified: false }, OWNER)).toBe(false);
    expect(isAdmin({ email: OWNER }, OWNER)).toBe(false);
  });

  it("rejects a null user", () => {
    expect(isAdmin(null, OWNER)).toBe(false);
    expect(isAdmin(undefined, OWNER)).toBe(false);
  });

  it("rejects a verified address that is not allowlisted", () => {
    expect(isAdmin({ email: "someone@example.com", emailVerified: true }, OWNER)).toBe(
      false,
    );
  });
});

describe("hasAdmins", () => {
  it("reports whether anyone is configured", () => {
    expect(hasAdmins(OWNER)).toBe(true);
    expect(hasAdmins("")).toBe(false);
    expect(hasAdmins(undefined)).toBe(false);
  });
});
