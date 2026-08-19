import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  machineDate,
  relativeTime,
} from "./format";

const NOW = new Date("2026-03-15T12:00:00.000Z");

/** Minutes before NOW, as a Date. */
function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe("relativeTime", () => {
  it("collapses anything under a minute", () => {
    expect(relativeTime(NOW, NOW)).toBe("just now");
    expect(relativeTime(ago(59 * SECOND), NOW)).toBe("just now");
  });

  it("switches unit at each boundary", () => {
    expect(relativeTime(ago(MINUTE), NOW)).toBe("1 minute ago");
    expect(relativeTime(ago(HOUR), NOW)).toBe("1 hour ago");
    expect(relativeTime(ago(DAY), NOW)).toBe("yesterday");
    expect(relativeTime(ago(WEEK), NOW)).toBe("last week");
  });

  it("stays relative up to four weeks and goes absolute beyond", () => {
    expect(relativeTime(ago(3 * WEEK), NOW)).toBe("3 weeks ago");
    // The cutoff exists because "43 weeks ago" is less informative than a date.
    expect(relativeTime(ago(30 * WEEK), NOW)).toBe("17 Aug 2025");
  });

  it("describes future dates rather than clamping them", () => {
    // A scheduled post in the admin list depends on this.
    expect(relativeTime(new Date(NOW.getTime() + 2 * HOUR), NOW)).toBe("in 2 hours");
    expect(relativeTime(new Date(NOW.getTime() + 3 * DAY), NOW)).toBe("in 3 days");
  });

  it("defaults `now` to the present without throwing", () => {
    expect(relativeTime(new Date())).toBe("just now");
  });
});

describe("absolute formatting", () => {
  it("formats a date and a date-time in UTC", () => {
    const date = new Date("2025-10-12T14:30:00.000Z");
    expect(formatDate(date)).toBe("12 Oct 2025");
    // Fixed to UTC so a server in another zone cannot render a different day.
    expect(formatDateTime(date)).toContain("12 Oct 2025");
    expect(formatDateTime(date)).toContain("14:30");
  });

  it("emits an ISO instant for the datetime attribute", () => {
    expect(machineDate(new Date("2025-10-12T14:30:00.000Z"))).toBe(
      "2025-10-12T14:30:00.000Z",
    );
  });
});
