'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * The first room inside. A window on one wall; the light it throws travels
 * across the floor as you scroll. Decorative only.
 */
export function WindowSetting() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const x = useTransform(scrollYProgress, [0, 1], ['-8%', '26%'])
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the window frame */}
      <div className="absolute right-[8%] top-[16%] h-[42vh] w-[24vw] min-w-[180px] rounded-sm bg-surface-raised ring-1 ring-rule">
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-rule" />
      </div>
      {/* the light it throws */}
      <motion.div
        className="absolute right-[6%] top-[18%] h-[64vh] w-[34vw] rounded-[40%] bg-accent opacity-[0.14] blur-3xl"
        style={reduce ? undefined : { x }}
      />
    </div>
  )
}

export function WindowRoom() {
  return (
    <Room className="mx-auto max-w-3xl">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.window.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.window.heading}</h2>
        <p className="mt-4 max-w-xl font-sans leading-relaxed text-fg-muted">{rooms.window.lede}</p>
      </RevealOnActive>
      <dl className="mt-10 space-y-8">
        {rooms.window.principles.map((p, i) => (
          <RevealOnActive key={p.title} index={i + 1}>
            <dt className="font-serif text-2xl leading-tight text-accent">{p.title}</dt>
            <dd className="mt-2 max-w-2xl font-sans leading-relaxed text-fg">{p.body}</dd>
          </RevealOnActive>
        ))}
      </dl>
    </Room>
  )
}
