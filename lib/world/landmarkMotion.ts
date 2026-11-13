import type { RigMode } from './rig'

/*
 * The small ways a landmark answers the visitor, shared by every landmark
 * (one mechanism, in `components/world/LandmarkMotion.tsx`, never code of a
 * landmark's own): a pulse that stretches it up and squashes it down about
 * its base and settles, over a fraction of a second. Hovered or focused from
 * afar, it lifts first; landed on by the camera, it settles with a squash
 * first. The pulse scales the whole landmark (its batch), so it costs no
 * draw call and touches none of its own moving parts. None under reduced
 * motion.
 */

/** How each pulse runs: its length (ms), how far it stretches at most (a fraction of its height; negative squashes first), and how many swings it makes. */
export const PULSES = {
  hover: { ms: 620, amount: 0.075, swings: 1.25 },
  land: { ms: 760, amount: -0.07, swings: 1.5 },
} as const

export type PulseKind = keyof typeof PULSES
/** The pulses by number, for a typed array of which is running. */
export const PULSE_KINDS: readonly PulseKind[] = ['hover', 'land']

/**
 * The stretch `ms` into a pulse of `kind`: up (positive) or down, swinging
 * and dying away, 0 at its start and from its end on.
 */
export function pulseStretch(kind: PulseKind, ms: number): number {
  const { ms: length, amount, swings } = PULSES[kind]
  if (!(ms > 0) || ms >= length) return 0
  const t = ms / length
  return amount * Math.sin(2 * Math.PI * swings * t) * (1 - t) ** 2
}

/** The scale across the ground for a stretch `s` up, keeping the landmark's volume: taller is thinner, squashed is wider. */
export const acrossFor = (s: number) => 1 / Math.sqrt(1 + s)

/** What the camera rig last reported, as far as a landing goes. */
export interface RigSeen {
  mode: RigMode | null
  target: string | null
}

/** The place the camera has just landed on, if it has: it is now at a place (`focus`) it was not at before. */
export function landedOn(before: RigSeen, now: RigSeen): string | null {
  if (now.mode !== 'focus' || now.target === null) return null
  return before.mode === 'focus' && before.target === now.target ? null : now.target
}
