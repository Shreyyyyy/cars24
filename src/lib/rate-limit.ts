/**
 * In-process sliding-window rate limiter.
 * Adequate for a single instance; move to Redis (already in docker-compose) when scaling horizontally.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 30);
const MAX_TRACKED_KEYS = 10_000;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
