'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion, useInView, animate } from 'framer-motion'
import { parseStatValue, formatCountValue } from '@/lib/countup'
import { ease } from '@/lib/motion'

/**
 * Animates a stat numeral up from zero. Triggers on scroll-into-view by
 * default, or on an external `active` flag (used inside the journey so the
 * count runs when the scene lands, not at page load). Reduced motion / non-
 * numeric values render the final value immediately.
 */
export function CountUp({
  value,
  className = '',
  active,
}: {
  value: string
  className?: string
  active?: boolean
}) {
  const parsed = parseStatValue(value)
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { margin: '-15%' })
  const run = active === undefined ? inView : active
  const [display, setDisplay] = useState(() =>
    reduce || !parsed.animatable ? value : formatCountValue(parsed, 0)
  )

  useEffect(() => {
    if (reduce || !parsed.animatable) {
      setDisplay(value)
      return
    }
    if (!run) {
      setDisplay(formatCountValue(parsed, 0))
      return
    }
    const controls = animate(0, parsed.target, {
      duration: 1.9,
      ease: ease.out,
      onUpdate: (v) => setDisplay(formatCountValue(parsed, v)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, reduce, parsed.target, parsed.animatable])

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
