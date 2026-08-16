'use client'

import { useState } from 'react'
import { contactClientSchema } from '@/lib/contact/schema'
import { inquiryOptions } from '@/content/contactOptions'
import { site } from '@/content/site'
import { Turnstile } from '@/components/primitives/Turnstile'

type Status = 'idle' | 'submitting' | 'success' | 'error'
type Errors = Partial<Record<string, string>>

const fieldClass =
  'w-full rounded-lg border border-rule bg-surface px-4 py-3 font-sans text-fg placeholder:text-fg-muted/60 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const labelClass = 'block font-sans text-sm font-medium text-fg'

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [serverMessage, setServerMessage] = useState('')
  const [token, setToken] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerMessage('')

    const form = e.currentTarget
    const fd = new FormData(form)
    const payload = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      company: String(fd.get('company') ?? ''),
      inquiryType: String(fd.get('inquiryType') ?? ''),
      message: String(fd.get('message') ?? ''),
      company_url: String(fd.get('company_url') ?? ''),
    }

    // Client-side validation mirrors the server schema (minus the token).
    const result = contactClientSchema.safeParse(payload)
    if (!result.success) {
      const next: Errors = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      setStatus('error')
      return
    }

    if (!token) {
      setStatus('error')
      setServerMessage('Please complete the verification challenge below.')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, turnstileToken: token }),
      })
      const data = (await res.json()) as {
        ok: boolean
        message?: string
        errors?: Errors
      }

      if (res.ok && data.ok) {
        setStatus('success')
        setServerMessage(data.message ?? 'Thank you — your message is on its way.')
        form.reset()
        return
      }

      setStatus('error')
      if (data.errors) setErrors(data.errors)
      setServerMessage(data.message ?? 'Something went wrong. Please try again.')
    } catch {
      setStatus('error')
      // The mailto fallback is appended to every error message at render time.
      setServerMessage('Network error — please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="rounded-xl border border-accent/40 bg-surface-raised p-8 text-center"
      >
        <p className="font-serif text-2xl text-fg">Message sent.</p>
        <p className="mt-2 font-sans text-fg-muted">{serverMessage}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Honeypot — visually hidden, off the tab order, hidden from AT. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="company_url">Company URL (leave blank)</label>
        <input id="company_url" name="company_url" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name}>
          <input id="name" name="name" type="text" autoComplete="name" className={fieldClass}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" className={fieldClass}
            aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
        </Field>
      </div>

      <Field id="company" label="Company" optional error={errors.company}>
        <input id="company" name="company" type="text" autoComplete="organization" className={fieldClass}
          aria-invalid={!!errors.company} aria-describedby={errors.company ? 'company-error' : undefined} />
      </Field>

      <Field id="inquiryType" label="What kind of conversation are you looking to have?" error={errors.inquiryType}>
        <select id="inquiryType" name="inquiryType" defaultValue="" className={fieldClass}
          aria-invalid={!!errors.inquiryType} aria-describedby={errors.inquiryType ? 'inquiryType-error' : undefined}>
          <option value="" disabled>Select one…</option>
          {inquiryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field id="message" label="Message" error={errors.message}>
        <textarea id="message" name="message" rows={5} className={fieldClass}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : undefined} />
      </Field>

      <Turnstile onVerify={setToken} onExpire={() => setToken('')} />

      {/* Live region for non-field-level status. */}
      <div aria-live="polite" className="min-h-[1.5rem]">
        {/* Every failure path offers a way through. A spam-blocked (422)
            submission previously ended at "Something went wrong" with no route
            to a human — the e2e test that claimed to cover this was passing off
            a static mailto link that happened to sit elsewhere on the page. */}
        {status === 'error' && serverMessage && (
          <p role="alert" className="font-sans text-sm text-accent">
            {serverMessage}{' '}
            <a
              href={`mailto:${site.email}`}
              className="font-semibold underline underline-offset-4"
            >
              Or email me directly.
            </a>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center rounded-full bg-fill px-8 py-3 font-sans font-semibold text-fill-fg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-fg-muted">(optional)</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 font-sans text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}
