import { describe, it, expect } from 'vitest'
import { buildSubject, buildEmail } from '@/lib/contact/email'

const submission = {
  name: 'Jane Founder',
  email: 'jane@acme.com',
  company: 'Acme Inc',
  inquiryType: 'consulting',
  message: 'Line one.\nLine two.',
}

describe('buildSubject', () => {
  it('uses the site prefix + human inquiry label + name', () => {
    expect(buildSubject(submission)).toBe('[kyleemccarthy.com] Consulting or advisory — Jane Founder')
  })
})

describe('buildEmail', () => {
  const email = buildEmail(submission, { meta: { ip: '1.2.3.4', at: '2026-05-31T12:00:00Z' } })

  it('sets Reply-To to the submitter so Gmail replies go to them', () => {
    expect(email.replyTo).toBe('jane@acme.com')
  })

  it('includes every field in the plaintext body', () => {
    expect(email.text).toContain('Jane Founder')
    expect(email.text).toContain('jane@acme.com')
    expect(email.text).toContain('Acme Inc')
    expect(email.text).toContain('Consulting or advisory')
    expect(email.text).toContain('Line one.')
    expect(email.text).toContain('Line two.')
  })

  it('produces an HTML part and escapes user input', () => {
    const withHtml = buildEmail(
      { ...submission, message: '<script>alert(1)</script>' },
      { meta: { ip: '1.2.3.4', at: '2026-05-31T12:00:00Z' } }
    )
    expect(withHtml.html).toContain('&lt;script&gt;')
    expect(withHtml.html).not.toContain('<script>alert(1)</script>')
  })
})
