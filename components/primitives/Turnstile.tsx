'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'

/**
 * Cloudflare Turnstile widget (explicit render). Calls onVerify with a token,
 * onExpire when it lapses. Honors theme via the page's data-theme attribute.
 */
export function Turnstile({
  onVerify,
  onExpire,
  className = '',
}: {
  onVerify: (token: string) => void
  onExpire: () => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) return

    function renderWidget() {
      if (!containerRef.current || !window.turnstile || widgetId.current) return
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onExpire(),
        'error-callback': () => onExpire(),
        theme: 'auto',
        action: 'contact',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else if (!document.querySelector(`script[src^="${SCRIPT_SRC.split('?')[0]}"]`)) {
      window.onTurnstileLoad = renderWidget
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    } else {
      window.onTurnstileLoad = renderWidget
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) {
    return (
      <p className="font-sans text-sm text-fg-muted">
        (Spam protection is not configured in this environment.)
      </p>
    )
  }

  return <div ref={containerRef} className={className} />
}
