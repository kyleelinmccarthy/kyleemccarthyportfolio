'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { greetingForHour } from './greeting'
import { NameLogo } from '@/components/primitives/NameLogo'
import { rooms } from '@/content/rooms'

/**
 * Outside, at dusk. The door opens by itself a beat after you arrive and light
 * spreads down the steps. Purely decorative — the welcome underneath is in the
 * DOM and readable whether or not the door ever moves.
 */
export function StepsSetting() {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Doorway and steps are one stack, so the top step meets the threshold.
          They used to be positioned independently: the door ended around 64%
          and the steps sat at the very bottom of the viewport, leaving a gap
          that read as descending into a basement rather than climbing to a
          front door. The steps now start AT the threshold and widen as they
          come toward the viewer, which is what walking up to a house looks
          like. */}
      <div className="absolute inset-x-0 top-[10%] flex flex-col items-center">
        {/* the doorway, with the door hinged inside it */}
        <div
          className="relative h-[40vh] w-[22vw] min-w-[190px] rounded-t-[10rem] bg-surface-raised ring-1 ring-rule"
          style={{ perspective: '900px' }}
        >
          <motion.div
            className="absolute inset-0 origin-left rounded-t-[10rem] bg-surface ring-1 ring-rule"
            initial={reduce ? { rotateY: -78 } : { rotateY: 0 }}
            animate={{ rotateY: -78 }}
            transition={{ delay: 0.6, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        {/* steps descending from the threshold toward the viewer, each one
            wider and a shade brighter as it gets nearer */}
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="block border-t border-rule bg-surface-raised"
            style={{
              width: `${24 + i * 9}%`,
              height: '2.6vh',
              opacity: 0.45 + i * 0.09,
            }}
          />
        ))}
      </div>
      {/* light spilling out of the open doorway and down over the steps */}
      <motion.div
        className="absolute left-1/2 top-[16%] h-[64vh] w-[40vw] -translate-x-1/2 rounded-full bg-accent blur-3xl"
        initial={reduce ? { opacity: 0.26 } : { opacity: 0 }}
        animate={{ opacity: 0.26 }}
        transition={{ delay: 1.1, duration: 1.8 }}
      />
    </div>
  )
}

/**
 * Greets by the visitor's local time of day.
 *
 * The neutral welcome renders on the server and on the first client paint —
 * their timezone isn't knowable until we're running in their browser, and
 * guessing would mean a hydration mismatch. The time-aware greeting swaps in
 * after mount. With JS off, the neutral one simply stays, which is why it has
 * to read well on its own rather than being a placeholder.
 */
function Greeting({ className }: { className?: string }) {
  // Explicit string: `rooms` is `as const`, so inference would pin this to the
  // neutral welcome's literal type and reject every real greeting.
  const [text, setText] = useState<string>(rooms.steps.welcome)
  useEffect(() => {
    setText(greetingForHour(new Date().getHours()))
  }, [])
  return <h1 className={className}>{text}</h1>
}

export function StepsRoom() {
  return (
    <Room className="mx-auto max-w-3xl text-center">
      <NameLogo size="hero" animate />
      {/* The building's only h1: this room is the first thing the home page
          says, so the greeting carries the page's single top-level heading
          (a11y.spec.ts, smoke.spec.ts both require exactly one). */}
      <Greeting className="mt-8 font-serif text-fluid-h2 text-fg" />
      <p className="mx-auto mt-4 max-w-xl font-sans text-lg leading-relaxed text-fg-muted">
        {rooms.steps.line}
      </p>
    </Room>
  )
}
