import { contactSchema } from './schema'
import { screenMessage } from './heuristics'
import { buildEmail, type BuiltEmail } from './email'
import type { RateLimiter } from './rateLimit'
import type { TurnstileResult } from './turnstile'
import { site } from '@/content/site'

export interface ContactDeps {
  ip: string
  userAgent?: string
  rateLimiter: RateLimiter
  verifyTurnstile: (token: string, ip: string) => Promise<TurnstileResult>
  sendEmail: (email: BuiltEmail, meta: { ip: string; at: string }) => Promise<{ id?: string }>
  now: () => Date
}

export interface ContactResponse {
  status: number
  body: {
    ok: boolean
    message?: string
    errors?: Record<string, string>
    retryAfter?: number
  }
}

const FALLBACK = `Something went wrong on our end — please email me directly at ${site.email}.`

/**
 * Pure contact pipeline (DIP — all I/O injected). Fail closed, but never lose
 * a legitimate message silently: real-looking failures tell the human to email.
 */
export async function handleContact(
  raw: unknown,
  deps: ContactDeps
): Promise<ContactResponse> {
  // 1. Rate limit first (cheap, blunts bursts).
  const rl = deps.rateLimiter.check(deps.ip)
  if (!rl.allowed) {
    return {
      status: 429,
      body: {
        ok: false,
        message: 'Too many submissions — please wait a moment and try again.',
        retryAfter: Math.ceil(rl.retryAfterMs / 1000),
      },
    }
  }

  // 2. Honeypot: if filled, pretend success and drop. (Bot path only.)
  if (raw && typeof raw === 'object' && 'company_url' in raw) {
    const hp = (raw as Record<string, unknown>).company_url
    if (typeof hp === 'string' && hp.trim() !== '') {
      return { status: 200, body: { ok: true } }
    }
  }

  // 3. Validate shape.
  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!errors[key]) errors[key] = issue.message
    }
    return { status: 400, body: { ok: false, message: 'Please fix the highlighted fields.', errors } }
  }
  const data = parsed.data

  // 4. Verify Turnstile (fail closed).
  const verdict = await deps.verifyTurnstile(data.turnstileToken, deps.ip)
  if (!verdict.success) {
    return {
      status: 400,
      body: { ok: false, message: 'Verification failed — please try the checkbox again.' },
    }
  }

  // 5. Heuristics — reject loudly (422), don't silently swallow a real person.
  const screen = screenMessage({ email: data.email, message: data.message })
  if (!screen.ok) {
    return {
      status: 422,
      body: {
        ok: false,
        message: `This looked automated and was blocked. If you're a real person, please email me directly at ${site.email}.`,
      },
    }
  }

  // 6. Send (any failure => 502 with a human fallback).
  const at = deps.now().toISOString()
  const email = buildEmail(
    {
      name: data.name,
      email: data.email,
      company: data.company,
      message: data.message,
    },
    { meta: { ip: deps.ip, at, userAgent: deps.userAgent } }
  )

  try {
    await deps.sendEmail(email, { ip: deps.ip, at })
  } catch {
    return { status: 502, body: { ok: false, message: FALLBACK } }
  }

  return {
    status: 200,
    body: { ok: true, message: 'Thank you — your message is on its way. I’ll be in touch soon.' },
  }
}
