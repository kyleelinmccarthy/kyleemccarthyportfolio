'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { CountUp } from '@/components/primitives/CountUp'
import { useSceneActive } from '@/components/journey/sceneActive'
import { growth } from '@/content/timeline'
import { ease } from '@/lib/motion'

/** The 40 → 130 → 200 growth curve; bars + numbers animate when the scene lands. */
export function GrowthBars() {
  const reduce = useReducedMotion()
  const sceneActive = useSceneActive()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-10%' })
  const run = sceneActive === null ? inView : sceneActive
  const max = Math.max(...growth.series.map((s) => s.value))

  return (
    <div ref={ref} className="rounded-xl bg-surface-raised p-6 sm:p-8">
      <p className="font-sans text-label uppercase text-accent">{growth.label}</p>
      <div className="mt-6 flex items-end gap-4 sm:gap-8" style={{ height: '180px' }}>
        {growth.series.map((s, i) => (
          <div key={s.period} className="flex flex-1 flex-col items-center justify-end">
            <CountUp
              value={String(s.value)}
              active={reduce ? true : run}
              className="mb-2 block font-serif text-3xl leading-none text-accent"
            />
            <motion.div
              className="w-full max-w-[64px] rounded-t-md bg-gradient-to-t from-accent-strong to-accent"
              initial={false}
              animate={{ height: reduce || run ? `${(s.value / max) * 120}px` : 0 }}
              transition={{ duration: 1.2, ease: ease.out, delay: 0.15 + i * 0.2 }}
            />
            <span className="mt-3 font-sans text-xs text-fg-muted">{s.period}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 font-sans text-sm leading-relaxed text-fg-muted">{growth.note}</p>
    </div>
  )
}
