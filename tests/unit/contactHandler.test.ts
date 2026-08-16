import { describe, it, expect, vi } from 'vitest'
import { handleContact, type ContactDeps } from '@/lib/contact/handler'
import { createRateLimiter } from '@/lib/contact/rateLimit'

const valid = {
  name: 'Jane Founder',
  email: 'jane@acme.com',
  company: 'Acme',
  message: 'I lead a Series B and want to talk about a fractional CTO engagement soon.',
  company_url: '',
  turnstileToken: 'good-token',
}

function makeDeps(over: Partial<ContactDeps> = {}): ContactDeps {
  return {
    ip: '1.2.3.4',
    userAgent: 'test',
    rateLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    verifyTurnstile: vi.fn().mockResolvedValue({ success: true }),
    sendEmail: vi.fn().mockResolvedValue({ id: 'email_123' }),
    now: () => new Date('2026-05-31T12:00:00Z'),
    ...over,
  }
}

describe('handleContact', () => {
  it('sends the email and returns 200 on the happy path', async () => {
    const deps = makeDeps()
    const res = await handleContact(valid, deps)
    expect(res.status).toBe(200)
    expect(deps.sendEmail).toHaveBeenCalledOnce()
  })

  it('silently accepts (200) but does NOT send when the honeypot is filled', async () => {
    const deps = makeDeps()
    const res = await handleContact({ ...valid, company_url: 'http://spam.test' }, deps)
    expect(res.status).toBe(200)
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on invalid input', async () => {
    const deps = makeDeps()
    const res = await handleContact({ ...valid, email: 'nope' }, deps)
    expect(res.status).toBe(400)
    expect(res.body.errors?.email).toBeTruthy()
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 400 when Turnstile verification fails', async () => {
    const deps = makeDeps({ verifyTurnstile: vi.fn().mockResolvedValue({ success: false }) })
    const res = await handleContact(valid, deps)
    expect(res.status).toBe(400)
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 422 (not silent) when heuristics reject, so a human is told to email directly', async () => {
    const deps = makeDeps()
    const res = await handleContact({ ...valid, email: 'x@mailinator.com' }, deps)
    expect(res.status).toBe(422)
    expect(res.body.message).toMatch(/email me directly/i)
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    const deps = makeDeps({ rateLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }) })
    await handleContact(valid, deps)
    const res = await handleContact(valid, deps)
    expect(res.status).toBe(429)
  })

  it('returns 502 when sending fails (never a silent loss)', async () => {
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('resend down')) })
    const res = await handleContact(valid, deps)
    expect(res.status).toBe(502)
    expect(res.body.message).toMatch(/email me directly/i)
  })
})
