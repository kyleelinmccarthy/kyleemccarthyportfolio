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
/**
 * Each letter of the signature fades and rises into place.
 *
 * No blur. The hidden state used to carry `filter: blur(4px)`, which was a
 * 4px blur on 96px script — a visible halo for the whole first half-second,
 * and a *permanent* one any time the animation failed to reach `visible`
 * (which happens: framer's useReducedMotion cannot resolve during SSR, and a
 * stalled hook left the wordmark fully opaque and permanently smeared).
 * Opacity and a small rise read just as well and cannot fail that way.
 */
export const signatureChar: Variants = {
  hidden: { opacity: 0, y: '0.35em' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: ease.out },
  },
}

/** When reduced motion is requested, render the settled state instantly. */
export const instant: Transition = { duration: 0 }
