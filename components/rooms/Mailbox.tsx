'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { rooms } from '@/content/rooms'

/**
 * A rural mailbox: a tunnel-shaped body on a post, a door with a knob on the
 * front, and a raised flag. Pure inline SVG in semantic tokens (no stock
 * colour, no image), so it themes correctly in both palettes with no
 * dark-mode asset. Decorative — aria-hidden — the copy and form beside it
 * carry the real content.
 */
function MailboxGlyph({ posted }: { posted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 150"
      className="h-28 w-32 sm:h-32 sm:w-36"
      fill="none"
    >
      {/* ground shadow */}
      <ellipse cx="70" cy="141" rx="46" ry="5" className="fill-fg" opacity="0.08" />
      {/* post */}
      <rect x="62" y="96" width="12" height="42" rx="2" className="fill-rule" />
      {/* the box: a tunnel-top body */}
      <path
        d="M20 96 V58 A40 40 0 0 1 100 58 V96 Z"
        className="fill-surface stroke-rule"
        strokeWidth="2.5"
      />
      {/* the door, seamed and knobbed */}
      <path d="M20 96 V70 A40 40 0 0 1 60 30" className="stroke-fill" strokeWidth="2" opacity="0.5" />
      <circle cx="92" cy="82" r="3.5" className="fill-accent" />
      {/* the slot the letter goes in */}
      <rect x="30" y="76" width="34" height="4" rx="2" className="fill-fill" opacity="0.7" />
      {/* the flag. Down until there is post in the box, then up. */}
      <rect x="98" y="44" width="5" height="34" rx="2" className="fill-rule" />
      <motion.path
        d="M103 46 h22 v14 l-22 6 Z"
        className="fill-accent"
        style={{ transformOrigin: '103px 78px' }}
        initial={false}
        animate={{ rotate: posted ? 0 : 62 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: posted ? 0.55 : 0 }}
      />
    </svg>
  )
}

/**
 * The letter going in.
 *
 * A sheet of the notebook's own paper flies from where the form was up to the
 * slot in the box, shrinking as it goes. It is the one moment in the whole
 * form that says the thing left your hands, and it costs nothing to anyone who
 * asked for less motion — they get the flag and the message, no flight.
 */
function LetterInFlight() {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute left-[8%] top-[46%] h-14 w-11 rounded-[2px] bg-card shadow-lg shadow-black/30 ring-1 ring-black/10"
      initial={{ x: 0, y: 0, rotate: -8, opacity: 0, scale: 1 }}
      animate={{
        x: [0, 20, 34],
        y: [0, -90, -128],
        rotate: [-8, 6, 2],
        opacity: [0, 1, 0],
        scale: [1, 0.9, 0.42],
      }}
      transition={{ duration: 1.05, times: [0, 0.55, 1], ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

/**
 * `posted` is the moment the letter is away: the flag goes up and a sheet of
 * paper flies into the slot. ContactForm owns it, because ContactForm is what
 * knows the send succeeded.
 */
export function Mailbox({ children, posted = false }: { children: ReactNode; posted?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-raised p-8 ring-1 ring-rule sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent opacity-[0.1] blur-3xl"
      />
      {posted && !reduce && <LetterInFlight />}
      <div className="relative flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:gap-6">
        <MailboxGlyph posted={posted} />
        <div>
          <p className="font-serif text-2xl text-fg">{rooms.wayOut.mailbox.label}</p>
          <p className="mt-2 max-w-sm font-sans text-sm leading-relaxed text-fg-muted">
            {rooms.wayOut.mailbox.hint}
          </p>
        </div>
      </div>
      <div className="relative mt-8">{children}</div>
    </div>
  )
}
