'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * The first room inside. A window on one wall — a real frame around real
 * glass, so the room's own wall shows through it — with daylight that falls
 * onto the floor and travels as you scroll. Decorative only.
 */
export function WindowSetting() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const x = useTransform(scrollYProgress, [0, 1], ['-8%', '26%'])
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* daylight falling through onto the floor, sweeping as you scroll.
          Opacity is a standalone utility, not a `/` colour modifier — this
          project's semantic tokens are plain CSS custom properties, and a
          slash-opacity class on one (`from-fill/30`) compiles to nothing. */}
      <motion.div
        className="absolute right-[2%] top-[46%] h-[42vh] w-[32vw] min-w-[220px] bg-gradient-to-b from-fill to-transparent opacity-30 blur-2xl"
        style={{
          clipPath: 'polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)',
          ...(reduce ? {} : { x }),
        }}
      />

      {/* the window: a frame around real glass, not a filled panel */}
      <div className="absolute right-[8%] top-[14%] h-[40vh] w-[22vw] min-w-[180px]">
        {/* frame: solid, like real wood or vinyl trim */}
        <div className="relative h-full w-full rounded-sm bg-surface-raised shadow-md ring-4 ring-rule">
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
        <div className="absolute -bottom-2 left-1/2 h-2 w-[114%] -translate-x-1/2 rounded-sm bg-surface-raised shadow-sm" />
      </div>
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
        <p className="mt-4 max-w-xl font-sans leading-relaxed text-fg-muted">{rooms.window.lede}</p>
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
