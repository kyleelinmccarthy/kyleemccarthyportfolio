import { Resend } from 'resend'
import type { BuiltEmail } from './email'

/** Thin Resend wrapper so the handler depends on an interface, not the SDK. */
export async function sendViaResend(
  email: BuiltEmail,
  _meta: { ip: string; at: string }
): Promise<{ id?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM_EMAIL
  const to = process.env.CONTACT_TO_EMAIL

  if (!apiKey || !from || !to) {
    throw new Error('Email is not configured (missing RESEND_API_KEY / from / to).')
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
  })

  if (error) throw new Error(error.message)
  return { id: data?.id }
}
