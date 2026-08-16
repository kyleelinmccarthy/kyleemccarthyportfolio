'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
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
      {/* the steps */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block border-t border-rule bg-surface-raised"
            style={{ width: `${34 + i * 6}%`, height: '2.2vh', opacity: 0.5 + i * 0.1 }}
          />
        ))}
      </div>
      {/* the doorway */}
      <div className="absolute left-1/2 top-[18%] h-[46vh] w-[22vw] min-w-[190px] -translate-x-1/2 rounded-t-[10rem] bg-surface-raised ring-1 ring-rule" />
      {/* the door, swinging open */}
      <motion.div
        className="absolute left-1/2 top-[18%] h-[46vh] w-[22vw] min-w-[190px] origin-left rounded-t-[10rem] bg-surface ring-1 ring-rule"
        style={{ translateX: '-50%' }}
        initial={reduce ? { rotateY: -78 } : { rotateY: 0 }}
        animate={{ rotateY: -78 }}
        transition={{ delay: 0.6, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* light spilling out */}
      <motion.div
        className="absolute left-1/2 top-[24%] h-[62vh] w-[38vw] -translate-x-1/2 rounded-full bg-accent blur-3xl"
        initial={reduce ? { opacity: 0.28 } : { opacity: 0 }}
        animate={{ opacity: 0.28 }}
        transition={{ delay: 1.1, duration: 1.8 }}
      />
    </div>
  )
}

export function StepsRoom() {
  return (
    <Room className="mx-auto max-w-3xl text-center">
      <NameLogo size="hero" animate />
      {/* The building's only h1: this room is the first thing the home page
          says, so its welcome line carries the page's single top-level
          heading (a11y.spec.ts, smoke.spec.ts both require exactly one). */}
      <h1 className="mt-8 font-serif text-fluid-h2 text-fg">{rooms.steps.welcome}</h1>
      <p className="mx-auto mt-4 max-w-xl font-sans text-lg leading-relaxed text-fg-muted">
        {rooms.steps.line}
      </p>
    </Room>
  )
}
