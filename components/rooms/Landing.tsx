'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { RevealOnActive, useSceneAdvance } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * Is there room for the staircase to be its own thing?
 *
 * Under 1024px the room's copy and the flight overlap, and the copy is on top
 * — so the stairs would be a control whose middle you cannot click. A control
 * nobody can operate is worse than a picture, so narrower screens get the
 * picture. Above it the copy is held to a left column and the flight sits
 * clear of it in the right.
 *
 * Starts false and settles after mount: the server cannot know the viewport,
 * and guessing would mean a hydration mismatch.
 */
function useRoomForStairs() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return wide
}

/**
 * The flight, or a picture of it — a button where it leads somewhere and
 * there is room to reach it, inert otherwise. Same reasoning as the front
 * door's slab.
 */
function Flight({
  interactive,
  onActivate,
  label,
  children,
}: {
  interactive: boolean
  onActivate: () => void
  label: string
  children: ReactNode
}) {
  // Narrow and hard right, so it clears the copy's column rather than
  // overlapping it — an overlapping flight is one whose centre you cannot
  // click, because the text is above it.
  // Over the part of the picture the staircase occupies, with room beneath
  // for the label that hangs off it.
  const className =
    'absolute bottom-[14%] right-[4%] h-[56vh] w-[24vw] min-w-[210px] max-w-[300px]'
  if (!interactive) {
    return (
      <div aria-hidden="true" className={className}>
        {children}
      </div>
    )
  }
  return (
    // z-20 where it is a control: the room's content column is z-10 and, being
    // a full-width block, it sits over the stairs everywhere they overlap — so
    // the click would land on empty div beside the copy instead. The flight is
    // out at the right, well clear of the text, so lifting it is safe.
    <button
      type="button"
      onClick={onActivate}
      aria-label={label}
      className={`${className} group pointer-events-auto z-20 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface`}
    >
      {children}
    </button>
  )
}

/**
 * The landing at the foot of the stairs.
 *
 * There was a window here, and you were invited to click through it. Nobody
 * goes through a window — and the shaft of light it cast across the floor read
 * as a rendering fault rather than as daylight.
 *
 * The stairs are not drawn. Two attempts at drawing them both fought the
 * room's own photograph, which has a staircase in it already: flat pale bars
 * standing in front of real steps, going a different way. What is drawn is the
 * light — a warm band climbing the flight, on a loop — over the part of the
 * picture the stairs actually occupy, plus a word at the bottom. The
 * photograph supplies the stairs; this supplies the invitation.
 */
export function StairsSetting() {
  const advance = useSceneAdvance()
  const roomForStairs = useRoomForStairs()
  const reduce = useReducedMotion()

  return (
    // Not aria-hidden. The flight is a control, and a focusable control inside
    // an aria-hidden subtree is reachable by tab and invisible to a screen
    // reader — the exact fault the front door had. The scenery around it is
    // hidden individually instead.
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Light from the floor above, pooling at the top of the flight. */}
      <div
        aria-hidden="true"
        className="absolute right-[6%] top-[6%] h-[40vh] w-[30vw] min-w-[200px] rounded-[50%] bg-accent opacity-[0.14] blur-3xl"
      />

      <Flight
        interactive={!!advance && roomForStairs}
        onActivate={() => advance?.()}
        label={`${rooms.landing.stairs.label} — ${rooms.landing.stairs.description}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 block overflow-hidden rounded-sm bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-[0.09] group-focus-visible:opacity-[0.09]"
        />
        {/* The light going up. Blurred and wide, because it is light falling
            across steps rather than an object sliding over them. */}
        {!reduce && (
          <span aria-hidden="true" className="absolute inset-0 block overflow-hidden rounded-sm">
            <motion.span
              // Wider than the box and heavily blurred, so its own edges never
              // show: what should read is light on the steps, not a rectangle
              // sliding over them.
              className="absolute inset-x-[-40%] block h-[26%] bg-gradient-to-t from-transparent via-accent to-transparent blur-2xl"
              animate={{ top: ['88%', '-20%'], opacity: [0, 0.34, 0.34, 0] }}
              transition={{
                duration: 2.6,
                times: [0, 0.18, 0.7, 1],
                repeat: Infinity,
                repeatDelay: 1.1,
                ease: 'easeInOut',
              }}
            />
          </span>
        )}
        {/* Said out loud at the foot of the flight. A photograph of a
            staircase, however clear, does not say "press me". */}
        <span className="pointer-events-none absolute inset-x-0 -bottom-9 mx-auto w-fit rounded-full bg-surface-raised/95 px-3 py-1 font-sans text-label uppercase text-fg ring-1 ring-fill/40 transition-colors duration-200 group-hover:text-accent group-hover:ring-accent">
          {rooms.landing.stairs.label}{' '}
          {reduce ? (
            <span aria-hidden="true">↑</span>
          ) : (
            <motion.span
              aria-hidden="true"
              className="inline-block"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              ↑
            </motion.span>
          )}
        </span>
      </Flight>
    </div>
  )
}

export function LandingRoom() {
  return (
    // Left column: the flight stands in the right one. mr-auto rather than
    // mx-auto, so the copy does not drift under the stairs on a wide screen.
    <Room className="mr-auto max-w-2xl">
      <RevealOnActive>
        {/* What the house says as you come through the door. Deliberately
            larger than the section heading under it — this is the line, and
            the three principles are its evidence. */}
        <p className="max-w-2xl font-serif text-fluid-h2 leading-tight text-fg">
          {rooms.landing.entry}
        </p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <p className="mt-12 font-sans text-label uppercase text-accent">{rooms.landing.eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl text-fg">{rooms.landing.heading}</h2>
      </RevealOnActive>
      <dl className="mt-10 space-y-8">
        {rooms.landing.principles.map((p, i) => (
          <RevealOnActive key={p.title} index={i + 2}>
            <dt className="font-serif text-2xl leading-tight text-accent">{p.title}</dt>
            <dd className="mt-2 max-w-2xl font-sans leading-relaxed text-fg">{p.body}</dd>
          </RevealOnActive>
        ))}
      </dl>
    </Room>
  )
}
