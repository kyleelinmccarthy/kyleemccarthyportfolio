'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
  // bottom-[12%] leaves room for the label that hangs beneath the flight.
  const className =
    'absolute bottom-[12%] right-[3%] h-[58vh] w-[26vw] min-w-[220px] max-w-[320px]'
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

/** How many treads. Enough to read as a flight rather than a stoop. */
const TREADS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/**
 * The landing at the foot of the stairs.
 *
 * There was a window here, and you were invited to click through it. Nobody
 * goes through a window — and the shaft of light it cast across the floor read
 * as a rendering fault rather than as daylight. A staircase does the same job
 * honestly: the next room is upstairs, the camera climbs to reach it, and the
 * thing you click is the way up.
 *
 * Treads recede as they rise: each is narrower, further right and a shade
 * darker than the one below, which is what makes a flat stack of bars read as
 * going away from you. Light spills down from the top of the flight.
 */
export function StairsSetting() {
  const advance = useSceneAdvance()
  const roomForStairs = useRoomForStairs()

  return (
    // Not aria-hidden. The flight is a control, and a focusable control inside
    // an aria-hidden subtree is reachable by tab and invisible to a screen
    // reader — the exact fault the front door had. The scenery around it is
    // hidden individually instead. (It also made the stairs unfindable by
    // role, which is how this was caught.)
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Light from the floor above, pooling at the top of the flight. */}
      <div
        aria-hidden="true"
        className="absolute right-[6%] top-[8%] h-[42vh] w-[34vw] min-w-[220px] rounded-[50%] bg-accent opacity-[0.13] blur-3xl"
      />

      <Flight
        interactive={!!advance && roomForStairs}
        onActivate={() => advance?.()}
        label={`${rooms.landing.stairs.label} — ${rooms.landing.stairs.description}`}
      >
        <div aria-hidden="true" className="relative h-full w-full">
          {TREADS.map((i) => {
            const t = i / (TREADS.length - 1)
            return (
              <span key={i} className="absolute block">
                {/* The tread you walk on. */}
                <span
                  className="absolute rounded-[2px] bg-surface-raised ring-1 ring-fill/25 transition-colors duration-200 group-hover:ring-accent"
                  style={{
                    bottom: `${6 + t * 74}%`,
                    right: `${t * 26}%`,
                    width: `${92 - t * 34}%`,
                    height: '5.5%',
                    // Brighter than they were: the entrance photograph has its
                    // own staircase, and faint treads drawn on top of it read
                    // as part of the picture rather than as something to press.
                    opacity: 0.82 + (1 - t) * 0.18,
                  }}
                />
                {/* The riser under it, a shade darker, so the flight has depth
                    rather than reading as a ladder of floating bars. */}
                <span
                  className="absolute rounded-[1px] bg-surface"
                  style={{
                    bottom: `${2.5 + t * 74}%`,
                    right: `${t * 26}%`,
                    width: `${92 - t * 34}%`,
                    height: '3.5%',
                    opacity: 0.5,
                  }}
                />
              </span>
            )
          })}
          {/* The banister, climbing with the treads. */}
          <span
            className="absolute bottom-[10%] left-[2%] h-[2px] w-[86%] origin-bottom-left rounded-full bg-fill opacity-50"
            style={{ transform: 'rotate(-38deg)' }}
          />
        </div>
        {/* Said out loud at the foot of the flight. Drawn treads over a
            photograph of a staircase are ambiguous; a word is not. */}
        <span className="pointer-events-none absolute inset-x-0 -bottom-9 mx-auto w-fit rounded-full bg-surface-raised/90 px-3 py-1 font-sans text-label uppercase text-fg-muted ring-1 ring-rule transition-colors duration-200 group-hover:text-accent group-hover:ring-accent">
          {rooms.landing.stairs.label} <span aria-hidden="true">↑</span>
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
