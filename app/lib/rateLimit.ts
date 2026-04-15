/**
 * Lightweight in-memory rate limiter for serverless functions.
 * Resets on cold start — good enough to stop accidental/casual abuse.
 * For stricter limits, swap for Upstash Redis.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request should be allowed.
 * @param key      IP address or any unique identifier
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds (default 60s)
 */
export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests — please wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
