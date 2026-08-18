'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { RevealOnActive, useSceneAdvance } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * The first room inside. A window on one wall — a real frame around real
 * glass, so the room's own wall shows through it — with daylight that falls
 * onto the floor and travels as you scroll.
 *
 * The window is a button, the same as the front door a room back: click it to
 * walk on rather than scrolling. The light and the sill stay decorative. The
 * container keeps pointer-events-none so the room's copy is still selectable
 * through it; only the window itself takes clicks.
 */
/**
 * Is there room for the window to be its own thing?
 *
 * Below 768px the room's copy runs the full width and the window sits behind
 * it, so the window is unclickable — the text is on top of it. A control
 * nobody can operate is worse than a picture, so narrow screens get the
 * picture. Matches the breakpoint the journey uses for its camera.
 *
 * Starts false and settles after mount: the server cannot know the viewport,
 * and guessing would mean a hydration mismatch.
 */
function useRoomForAWindow() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return wide
}

/**
 * The window's outer box: a button where it leads somewhere and there is room
 * to reach it, an inert picture otherwise — same reasoning as the front door's
 * slab.
 */
function Frame({
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
  // z-20 where it is a control: the room's content column is z-10 and, being a
  // full-width block, it sits over the window everywhere they overlap — so the
  // click landed on an empty div beside the copy instead of on the window. The
  // window is out at right-8%, well clear of the text, so lifting it is safe.
  const className = 'absolute right-[8%] top-[14%] h-[40vh] w-[22vw] min-w-[180px] rounded-sm'
  if (!interactive) {
    return (
      <div aria-hidden="true" className={className}>
        {children}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={label}
      className={`${className} z-20 pointer-events-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface`}
    >
      {children}
    </button>
  )
}

export function WindowSetting() {
  const reduce = useReducedMotion()
  const advance = useSceneAdvance()
  const roomForAWindow = useRoomForAWindow()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const x = useTransform(scrollYProgress, [0, 1], ['-8%', '26%'])
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* daylight falling through onto the floor, sweeping as you scroll.
          Opacity is a standalone utility, not a `/` colour modifier — this
          project's semantic tokens are plain CSS custom properties, and a
          slash-opacity class on one (`from-fill/30`) compiles to nothing. */}
      <motion.div
        aria-hidden="true"
        className="absolute right-[2%] top-[46%] h-[42vh] w-[32vw] min-w-[220px] bg-gradient-to-b from-fill to-transparent opacity-30 blur-2xl"
        style={{
          clipPath: 'polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)',
          ...(reduce ? {} : { x }),
        }}
      />

      {/* the window: a frame around real glass, not a filled panel */}
      <Frame
        interactive={!!advance && roomForAWindow}
        onActivate={() => advance?.()}
        label={rooms.window.windowAction}
      >
        {/* frame: solid, like real wood or vinyl trim */}
        <div
          aria-hidden="true"
          className="relative h-full w-full rounded-sm bg-surface-raised shadow-md ring-4 ring-rule transition-shadow duration-200 hover:shadow-lg motion-reduce:transition-none"
        >
          {/* the glass: no fill of its own, so the room's own wall reads
              straight through it, plus a faint diagonal glare so it still
              looks like glass and not an empty hole. */}
          <div className="absolute inset-1 overflow-hidden rounded-[2px] ring-1 ring-rule">
            <div className="absolute inset-0 bg-gradient-to-br from-fill to-transparent opacity-15" />
            <div className="absolute -left-1/4 -top-1/3 h-2/3 w-1/2 rotate-12 bg-fg opacity-10 blur-md" />
            {/* mullions — two rows, so it reads as six panes rather than four */}
            <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-rule" />
            <span className="absolute inset-x-0 top-1/3 h-[3px] bg-rule" />
            <span className="absolute inset-x-0 top-2/3 h-[3px] bg-rule" />
          </div>
        </div>
        {/* sill */}
        <div
          aria-hidden="true"
          className="absolute -bottom-2 left-1/2 h-2 w-[114%] -translate-x-1/2 rounded-sm bg-surface-raised shadow-sm"
        />
      </Frame>
    </div>
  )
}

export function WindowRoom() {
  return (
    <Room className="mx-auto max-w-3xl">
      <RevealOnActive>
        {/* What the house says as you come through the door. Deliberately
            larger than the section heading under it — this is the line, and
            the three principles are its evidence. */}
        <p className="max-w-2xl font-serif text-fluid-h2 leading-tight text-fg">
          {rooms.window.entry}
        </p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <p className="mt-12 font-sans text-label uppercase text-accent">{rooms.window.eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl text-fg">{rooms.window.heading}</h2>
      </RevealOnActive>
      <dl className="mt-10 space-y-8">
        {rooms.window.principles.map((p, i) => (
          <RevealOnActive key={p.title} index={i + 2}>
            <dt className="font-serif text-2xl leading-tight text-accent">{p.title}</dt>
            <dd className="mt-2 max-w-2xl font-sans leading-relaxed text-fg">{p.body}</dd>
          </RevealOnActive>
        ))}
      </dl>
    </Room>
  )
}
