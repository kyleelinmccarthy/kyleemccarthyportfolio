'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { signatureChar, staggerContainer } from '@/lib/motion'

type Size = 'nav' | 'hero' | 'footer'

/**
 * The "Kylee McCarthy" signature. Two script fonts are interleaved per the
 * brief's letterform spec; the whole thing is exposed to assistive tech as a
 * single image labelled "Kylee McCarthy" so the name is announced once, cleanly.
 *
 *   K    -> Give You Glory      ylee  -> Sacramento
 *   McC  -> Give You Glory      arthy -> Sacramento
 */
const SEGMENTS = [
  { text: 'K', font: 'gyg' },
  { text: 'ylee', font: 'sac' },
  { text: ' ', font: 'sac', space: true },
  { text: 'McC', font: 'gyg' },
  { text: 'arthy', font: 'sac' },
] as const

// Per-size scale. GYG runs optically smaller than Sacramento, so it is nudged
// up and the baseline aligned via line-height + translate in CSS classes below.
const sizeClasses: Record<Size, string> = {
  nav: 'text-3xl sm:text-4xl',
  hero: 'text-6xl sm:text-7xl lg:text-8xl',
  footer: 'text-4xl',
}

const fontClass: Record<'gyg' | 'sac', string> = {
  // GYG bumped slightly and lifted to share Sacramento's visual baseline.
  gyg: 'font-gyg text-[1.05em] [transform:translateY(0.06em)]',
  sac: 'font-sac',
}

export function NameLogo({
  size = 'nav',
  animate = false,
  className = '',
}: {
  size?: Size
  animate?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const shouldAnimate = animate && !reduce

  const chars = SEGMENTS.flatMap((seg, si) =>
    seg.text.split('').map((ch, ci, arr) => ({
      ch,
      font: seg.font,
      space: 'space' in seg && seg.space,
      // The capital "K" flourish needs room before "ylee"; the McC join does not.
      gap: si === 0 && ci === arr.length - 1,
      key: `${si}-${ci}`,
    }))
  )

  const baseClass = `inline-flex select-none items-baseline leading-none text-accent ${sizeClasses[size]} ${className}`

  if (!shouldAnimate) {
    return (
      <span role="img" aria-label="Kylee McCarthy" className={baseClass}>
        {chars.map((c) => (
          <span
            key={c.key}
            aria-hidden="true"
            className={`${c.space ? 'inline-block w-[0.28em]' : fontClass[c.font]} ${c.gap ? 'mr-[0.16em]' : ''}`}
          >
            {c.space ? ' ' : c.ch}
          </span>
        ))}
      </span>
    )
  }

  return (
    <motion.span
      role="img"
      aria-label="Kylee McCarthy"
      className={baseClass}
      variants={staggerContainer(0.055)}
      initial="hidden"
      animate="visible"
    >
      {chars.map((c) => (
        <motion.span
          key={c.key}
          aria-hidden="true"
          variants={signatureChar}
          className={`${c.space ? 'inline-block w-[0.28em]' : `inline-block ${fontClass[c.font]}`} ${c.gap ? 'mr-[0.16em]' : ''}`}
        >
          {c.space ? ' ' : c.ch}
        </motion.span>
      ))}
    </motion.span>
  )
}
