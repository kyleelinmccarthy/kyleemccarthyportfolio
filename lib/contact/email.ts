export interface ContactSubmission {
  name: string
  email: string
  company?: string
  message: string
}

export interface EmailMeta {
  ip: string
  at: string // ISO timestamp
  userAgent?: string
}

export interface BuiltEmail {
  subject: string
  text: string
  html: string
  replyTo: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Clear, filterable subject so legitimate messages surface in Gmail. */
export function buildSubject(s: ContactSubmission): string {
  return `[kyleemccarthy.com] New message from ${s.name}`
}

export function buildEmail(
  s: ContactSubmission,
  opts: { meta: EmailMeta }
): BuiltEmail {
  const company = s.company?.trim() || '—'

  const text = [
    `New message from kyleemccarthy.com`,
    ``,
    `Name:        ${s.name}`,
    `Email:       ${s.email}`,
    `Company:     ${company}`,
    ``,
    `Message:`,
    s.message,
    ``,
    `———`,
    `Submitted:   ${opts.meta.at}`,
    `IP:          ${opts.meta.ip}`,
    opts.meta.userAgent ? `User agent:  ${opts.meta.userAgent}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
  <div style="font-family:system-ui,sans-serif;color:#14131b;max-width:560px">
    <p style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#771606;margin:0 0 4px">
      New message · kyleemccarthy.com
    </p>
    <h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(s.name)}</h2>
    <table style="font-size:14px;line-height:1.5;border-collapse:collapse">
      <tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a></td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#666">Company</td><td>${escapeHtml(company)}</td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;margin:16px 0;padding:14px 16px;background:#f6efe4;border-left:3px solid #2f3b31;border-radius:4px">${escapeHtml(
      s.message
    )}</p>
    <p style="font-size:12px;color:#999;margin-top:24px">
      Submitted ${escapeHtml(opts.meta.at)} · IP ${escapeHtml(opts.meta.ip)}
    </p>
  </div>`.trim()

  return { subject: buildSubject(s), text, html, replyTo: s.email }
}
