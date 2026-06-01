import { describe, it, expect } from 'vitest'
import { countLinks, isDisposableEmail, screenMessage } from '@/lib/contact/heuristics'

describe('countLinks', () => {
  it('counts http(s) and bare www links', () => {
    expect(countLinks('no links here')).toBe(0)
    expect(countLinks('see https://a.com and http://b.com and www.c.com')).toBe(3)
  })
})

describe('isDisposableEmail', () => {
  it('flags known disposable domains, case-insensitively', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true)
    expect(isDisposableEmail('x@Guerrillamail.com')).toBe(true)
  })
  it('passes normal domains', () => {
    expect(isDisposableEmail('jane@acme.com')).toBe(false)
    expect(isDisposableEmail('jane@gmail.com')).toBe(false)
  })
})

describe('screenMessage', () => {
  const good = {
    email: 'jane@acme.com',
    message: 'I lead a Series B and would love to talk about a fractional CTO engagement.',
  }

  it('passes a legitimate message', () => {
    expect(screenMessage(good).ok).toBe(true)
  })

  it('rejects messages with too many links', () => {
    const message = 'buy now ' + ['http://a.com', 'http://b.com', 'http://c.com', 'http://d.com', 'http://e.com'].join(' ')
    expect(screenMessage({ ...good, message }).ok).toBe(false)
  })

  it('rejects disposable email domains', () => {
    expect(screenMessage({ ...good, email: 'spam@mailinator.com' }).ok).toBe(false)
  })

  it('rejects shouty all-caps spam of meaningful length', () => {
    expect(screenMessage({ ...good, message: 'CHEAP SEO BACKLINKS BUY NOW LIMITED OFFER ACT FAST' }).ok).toBe(false)
  })
})
