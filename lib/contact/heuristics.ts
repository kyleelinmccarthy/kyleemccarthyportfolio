/** Lightweight, cheap spam signals applied after Zod + Turnstile pass. */

const MAX_LINKS = 4

// A small bundled set — not exhaustive, just the high-volume offenders.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'sharklasers.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'throwawaymail.com',
])

const LINK_RE = /(https?:\/\/|www\.)/gi

export function countLinks(text: string): number {
  return (text.match(LINK_RE) ?? []).length
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

/** Shouty = mostly uppercase letters across a message long enough to mean it. */
function isShouty(message: string): boolean {
  const letters = message.replace(/[^a-z]/gi, '')
  if (letters.length < 20) return false
  const upper = message.replace(/[^A-Z]/g, '').length
  return upper / letters.length > 0.8
}

export interface ScreenResult {
  ok: boolean
  reason?: string
}

export function screenMessage(input: { email: string; message: string }): ScreenResult {
  if (isDisposableEmail(input.email)) {
    return { ok: false, reason: 'disposable-email' }
  }
  if (countLinks(input.message) > MAX_LINKS) {
    return { ok: false, reason: 'too-many-links' }
  }
  if (isShouty(input.message)) {
    return { ok: false, reason: 'shouty' }
  }
  return { ok: true }
}
