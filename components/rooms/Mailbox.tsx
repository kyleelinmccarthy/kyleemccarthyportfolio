import { type ReactNode } from 'react'
import { rooms } from '@/content/rooms'

/**
 * The contact form, framed as a mailbox — you post a letter, not a lead.
 * Drawn entirely in semantic tokens (no stock colour, no image), so it themes
 * correctly in both palettes without a separate dark-mode asset. The box
 * itself is decorative (aria-hidden); the copy and the form beneath it carry
 * the real content.
 */
export function Mailbox({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-raised p-8 ring-1 ring-rule sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent opacity-[0.1] blur-3xl"
      />
      {/* the box and its slot */}
      <div aria-hidden="true" className="relative mb-6 flex items-end gap-3">
        <span className="relative block h-11 w-16 rounded-t-lg bg-surface ring-1 ring-rule">
          <span className="absolute inset-x-2 top-3 h-1 rounded-full bg-accent" />
        </span>
        <span className="mb-1 h-7 w-3 rounded-sm bg-accent" />
      </div>
      <p className="font-serif text-2xl text-fg">{rooms.wayOut.mailbox.label}</p>
      <p className="mt-2 max-w-sm font-sans text-sm leading-relaxed text-fg-muted">
        {rooms.wayOut.mailbox.hint}
      </p>
      <div className="mt-8">{children}</div>
    </div>
  )
}
