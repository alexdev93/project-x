/**
 * Fixed-window, in-memory rate limiter keyed by client identifier.
 *
 * Scope note: state lives in the process, so on serverless each instance keeps
 * its own counters. That makes this a cheap abuse dampener, not a strict global
 * quota. It is enough to stop a single client hammering an endpoint, which is
 * the threat this portfolio actually has. Swap in a shared store (Upstash,
 * Redis) here if the limit ever needs to hold across instances.
 */

type Window = { count: number; resetAt: number };

export type RateLimitConfig = {
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Unix ms timestamp when the current window resets. */
  resetAt: number;
  /** Seconds until reset, for the Retry-After header. */
  retryAfterSeconds: number;
};

const buckets = new Map<string, Window>();

/** Drop expired windows so the map cannot grow without bound. */
function evictExpired(now: number): void {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();

  // Cheap amortised cleanup rather than a timer that would keep the process warm.
  if (buckets.size > 512) evictExpired(now);

  const existing = buckets.get(key);
  const window =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

  window.count += 1;
  buckets.set(key, window);

  const allowed = window.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - window.count),
    resetAt: window.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client identity. Vercel sets `x-forwarded-for`; the leftmost
 * entry is the original client. Falls back to a shared bucket when absent,
 * which fails closed (stricter) rather than open.
 */
export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}
