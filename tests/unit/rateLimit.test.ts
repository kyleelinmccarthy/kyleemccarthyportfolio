import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '@/lib/contact/rateLimit'

describe('createRateLimiter', () => {
  it('allows up to the limit then blocks within the window', () => {
    let now = 1_000_000
    const limiter = createRateLimiter({ limit: 3, windowMs: 10_000, now: () => now })

    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(false) // 4th within window
  })

  it('tracks IPs independently', () => {
    let now = 1_000_000
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: () => now })
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('b').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)
  })

  it('frees up the slot after the window slides past', () => {
    let now = 1_000_000
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: () => now })
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)
    now += 10_001
    expect(limiter.check('a').allowed).toBe(true)
  })
})
