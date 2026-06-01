/** Server-side Cloudflare Turnstile token verification. */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileResult {
  success: boolean
  errorCodes?: string[]
}

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
  // injectable for tests
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Fail closed: misconfiguration must not let bots through.
    return { success: false, errorCodes: ['missing-secret'] }
  }

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetchImpl(VERIFY_URL, { method: 'POST', body })
    const data = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }
    return { success: data.success, errorCodes: data['error-codes'] }
  } catch {
    return { success: false, errorCodes: ['verify-request-failed'] }
  }
}
