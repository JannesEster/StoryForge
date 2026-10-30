export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string, now: number): RateLimitResult;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, number[]>();

  return {
    check(key: string, now: number): RateLimitResult {
      const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
      if (recent.length >= limit) {
        buckets.set(key, recent);
        const oldest = recent[0] ?? now;
        const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
        return { ok: false, retryAfterSec };
      }
      recent.push(now);
      buckets.set(key, recent);
      if (buckets.size > 2000) {
        for (const [id, stamps] of buckets) {
          if (stamps.every((stamp) => now - stamp >= windowMs)) buckets.delete(id);
        }
      }
      return { ok: true, retryAfterSec: 0 };
    },
  };
}
