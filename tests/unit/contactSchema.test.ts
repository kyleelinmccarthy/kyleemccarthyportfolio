import { describe, it, expect } from 'vitest'
import { contactSchema } from '@/lib/contact/schema'

const base = {
  name: 'Jane Founder',
  email: 'jane@acme.com',
  company: 'Acme',
  message: 'I lead a Series B and want to talk fractional CTO engagements.',
  company_url: '',
  turnstileToken: 'tok',
}

describe('contactSchema', () => {
  it('accepts a well-formed message', () => {
    expect(contactSchema.safeParse(base).success).toBe(true)
  })

  it('treats company as optional', () => {
    const { company, ...rest } = base
    expect(contactSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects a filled honeypot (company_url)', () => {
    expect(contactSchema.safeParse({ ...base, company_url: 'http://x.test' }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(contactSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects too-short and too-long messages', () => {
    expect(contactSchema.safeParse({ ...base, message: 'hi' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...base, message: 'x'.repeat(4001) }).success).toBe(false)
  })

  it('rejects too-short names', () => {
    expect(contactSchema.safeParse({ ...base, name: 'A' }).success).toBe(false)
  })

  it('requires a turnstile token', () => {
    expect(contactSchema.safeParse({ ...base, turnstileToken: '' }).success).toBe(false)
  })

  it('trims whitespace from name and message', () => {
    const parsed = contactSchema.safeParse({ ...base, name: '  Jane  ', message: `  ${base.message}  ` })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.name).toBe('Jane')
      expect(parsed.data.message).toBe(base.message)
    }
  })
})
