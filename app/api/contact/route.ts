import { NextResponse } from 'next/server'
import { handleContact } from '@/lib/contact/handler'
import { contactRateLimiter } from '@/lib/contact/rateLimit'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { sendViaResend } from '@/lib/contact/send'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid request.' },
      { status: 400 }
    )
  }

  const result = await handleContact(payload, {
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
    rateLimiter: contactRateLimiter,
    verifyTurnstile,
    sendEmail: sendViaResend,
    now: () => new Date(),
  })

  return NextResponse.json(result.body, { status: result.status })
}
