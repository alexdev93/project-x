/**
 * Date presentation.
 *
 * `now` is a parameter on every function rather than a `Date.now()` call inside
 * them. Two reasons, and the second is the one that matters: it makes the
 * boundaries testable without freezing the clock, and it lets a server render
 * pass the *request* time explicitly, so a value baked into a cached page is
 * never mistaken for a live one.
 *
 * Locale is fixed to `en-GB`, matching the rest of the site's copy. Formatting
 * to the visitor's locale would differ between the server render and the client,
 * which is a hydration mismatch rather than a courtesy.
 */

const LOCALE = "en-GB";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const absolute = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const absoluteWithTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/**
 * "3 minutes ago", "yesterday", "2 weeks ago" — and then an absolute date once
 * a post is old enough that a relative one stops being informative. "43 weeks
 * ago" is a worse answer than "12 Oct 2025".
 *
 * Future dates are handled rather than clamped: a scheduled post shown in the
 * admin list reads "in 2 hours", which is the truth and is useful there.
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const magnitude = Math.abs(diff);

  if (magnitude < MINUTE) return "just now";
  if (magnitude < HOUR) return relative.format(Math.round(diff / MINUTE), "minute");
  if (magnitude < DAY) return relative.format(Math.round(diff / HOUR), "hour");
  if (magnitude < WEEK) return relative.format(Math.round(diff / DAY), "day");
  if (magnitude < 4 * WEEK) return relative.format(Math.round(diff / WEEK), "week");

  return absolute.format(date);
}

/** "12 Oct 2025". For bylines, where the exact day is the useful fact. */
export function formatDate(date: Date): string {
  return absolute.format(date);
}

/** "12 Oct 2025, 14:30". For admin tables, where ordering within a day matters. */
export function formatDateTime(date: Date): string {
  return absoluteWithTime.format(date);
}

/** The value a `<time datetime>` attribute needs: an ISO 8601 instant. */
export function machineDate(date: Date): string {
  return date.toISOString();
}
