import type { Variants, Transition } from 'framer-motion'

/** Shared motion tokens — one source for durations & easings (DRY). */
export const dur = {
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
} as const

export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const

/** Fade + slight slide-up. Used by <Reveal> for scroll-into-view sections. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.slow, ease: ease.out },
  },
}

/** Stagger container — children reveal in sequence. */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

/** Per-character "write-in" for the NameLogo signature. */
export const signatureChar: Variants = {
  hidden: { opacity: 0, y: '0.35em', filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: ease.out },
  },
}

/** When reduced motion is requested, render the settled state instantly. */
export const instant: Transition = { duration: 0 }
