'use client'

import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { CountUp } from '@/components/primitives/CountUp'
import { RevealOnActive, useSceneActive } from '@/components/journey/sceneActive'

/**
 * A single stat: value counts up when the block enters view. Used on the
 * standalone /about and /leadership pages, which have no journey scene
 * context, so this drives off a reliable block-level in-view trigger rather
 * than CountUp's own (flakier, inline-span) observer.
 */
export function Figure({
  value,
  label,
  index = 0,
}: {
  value: string
  label: string
  index?: number
}) {
  const sceneActive = useSceneActive()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const active = sceneActive === null ? inView : sceneActive
  return (
    <div ref={ref}>
      <RevealOnActive index={index}>
        <span className="block whitespace-nowrap font-serif text-fluid-stat leading-none text-accent">
          <CountUp value={value} active={active} />
        </span>
        <span className="mt-2 block max-w-[14rem] font-sans text-sm leading-snug text-fg-muted">
          {label}
        </span>
      </RevealOnActive>
    </div>
  )
}
