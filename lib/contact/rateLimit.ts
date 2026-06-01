/**
 * In-memory sliding-window rate limiter. Best-effort only: serverless cold
 * starts reset the map, so this blunts bursts rather than guaranteeing limits.
 * Turnstile + honeypot + heuristics are the real gate. Upgrade path = Vercel KV.
 */
export interface RateLimiterOptions {
  limit: number
  windowMs: number
  now?: () => number
}

export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfterMs: number }
}

export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>()

  return {
    check(key: string) {
      const t = now()
      const cutoff = t - windowMs
      const recent = (hits.get(key) ?? []).filter((ts) => ts > cutoff)

      if (recent.length >= limit) {
        const retryAfterMs = recent[0] + windowMs - t
        hits.set(key, recent)
        return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) }
      }

      recent.push(t)
      hits.set(key, recent)
      return { allowed: true, retryAfterMs: 0 }
    },
  }
}

/** Shared singleton for the route: 5 submissions per 10 minutes per IP. */
export const contactRateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 })
