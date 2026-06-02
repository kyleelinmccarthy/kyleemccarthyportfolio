'use client'

import { useState, type ReactNode } from 'react'

/**
 * A small info affordance: a trigger that shows the ⓘ glyph and reveals a
 * tooltip on hover/focus AND on click/tap (the click toggle is what makes it
 * usable on touch devices and discoverable where there's no scroll cue). Used
 * for things that have no link of their own — e.g. Aura, which is embedded in
 * other sites rather than standing alone.
 */
export function InfoTip({
  label,
  buttonClassName,
  children,
}: {
  label: ReactNode
  buttonClassName: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="group relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className={buttonClassName}
      >
        {label}
        <span aria-hidden="true" className="text-accent">
          ⓘ
        </span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-surface-raised px-3 py-2 text-center font-sans text-xs leading-snug text-fg-muted shadow-lg ring-1 ring-rule transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {children}
      </span>
    </span>
  )
}
