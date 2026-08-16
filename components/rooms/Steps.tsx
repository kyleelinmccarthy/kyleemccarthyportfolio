'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { greetingForHour } from './greeting'
import { rooms } from '@/content/rooms'

/**
 * Outside, at dusk: a low pool of light on the ground and the sky darkening
 * toward the top.
 *
 * The doorway itself is NOT here — it lives in the room's normal flow (see
 * StepsRoom) so it cannot land on top of the copy. When it was absolutely
 * positioned, the panel centred the text vertically while the scenery was
 * pinned from the top, and at some viewport ratios the steps cut straight
 * through the tagline. Flow layout makes that impossible at any height.
 *
 * What stays here is only what is safe to sit behind text: soft light, no
 * hard edges, and nothing bright enough for the nav's backdrop-blur to smear.
 */
export function StepsSetting() {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ground light, low and wide. Kept in the lower half deliberately: when
          this glow sat behind the wordmark it haloed the letters, and the
          fixed nav's backdrop-blur sampled it and turned the header yellow. */}
      <motion.div
        className="absolute left-1/2 top-[82%] h-[46vh] w-[85vw] -translate-x-1/2 rounded-[50%] bg-accent blur-3xl"
        initial={reduce ? { opacity: 0.12 } : { opacity: 0 }}
        animate={{ opacity: 0.12 }}
        transition={{ delay: 1.1, duration: 1.8 }}
      />
      {/* Darken the top so the sky recedes and the nav has a calm ground. */}
      <div className="absolute inset-x-0 top-0 h-[38vh] bg-gradient-to-b from-surface to-transparent" />
    </div>
  )
}

/**
 * The doorway, the door hinged inside it, and the steps coming down toward
 * the viewer. Decorative — hidden from assistive tech — but laid out in normal
 * flow above the copy so the two can never overlap.
 */
function Doorway() {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="flex flex-col items-center">
      <div
        className="pointer-events-auto relative h-[22vh] min-h-[130px] w-[15vw] min-w-[110px] rounded-t-[8rem] bg-fg/[0.12] ring-1 ring-fg/30"
        style={{ perspective: '900px' }}
      >
        {/* Warm light in the opening, behind the door. */}
        <span className="absolute inset-0 rounded-t-[8rem] bg-accent/25" />
        <motion.div
          className="absolute inset-0 origin-left rounded-t-[8rem] bg-fg/[0.22] ring-1 ring-fg/40"
          initial={reduce ? { rotateY: -58 } : { rotateY: 0 }}
          animate={{ rotateY: -58 }}
          whileHover={reduce ? undefined : { rotateY: -88 }}
          transition={{ delay: reduce ? 0 : 0.6, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Window pane set into the door itself, so it swings with it. */}
          <span className="absolute inset-x-[20%] top-[12%] block h-[30%] overflow-hidden rounded-t-[4rem] bg-accent/40 ring-1 ring-rule">
            <span className="absolute inset-x-0 top-1/2 block h-px bg-rule/60" />
            <span className="absolute inset-y-0 left-1/2 block w-px bg-rule/60" />
          </span>
          <span className="absolute right-[14%] top-[66%] block h-2 w-2 rounded-full bg-accent" />
        </motion.div>
      </div>

      {/* Steps down from the threshold, each wider and a shade brighter as it
          comes nearer. Widths are of this centred column, not the viewport. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block border-t border-fg/40 bg-fg/[0.17]"
          style={{
            width: `${110 + i * 46}px`,
            height: '1.5vh',
            minHeight: '9px',
            opacity: 0.72 + i * 0.07,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Greets by the visitor's local time of day.
 *
 * The neutral welcome renders on the server and on the first client paint —
 * their timezone isn't knowable until we're running in their browser, and
 * guessing would mean a hydration mismatch. The time-aware greeting swaps in
 * after mount. With JS off the neutral one simply stays, which is why it has
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
    <Room className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <Doorway />
      {/* No signature here — the nav carries the name on every page, and
          repeating it at 96px directly beneath it was saying it twice. */}
      {/* The building's only h1: this room is the first thing the home page
          says, so the greeting carries the page's single top-level heading
          (a11y.spec.ts, smoke.spec.ts both require exactly one). */}
      <Greeting className="mt-10 font-serif text-fluid-h2 text-fg" />
      <p className="mx-auto mt-3 max-w-xl font-sans text-lg leading-relaxed text-fg-muted">
        {rooms.steps.line}
      </p>
    </Room>
  )
}
