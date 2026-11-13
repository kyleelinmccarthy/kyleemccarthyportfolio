/*
 * A gesture: a small movement a part of a landmark makes once, when asked (a
 * pet hopping, wiggling or nodding when it is pressed), then is still again.
 * Pure, so every rule is a unit test; the kit's `Gesture` plays it.
 */

/**
 * What a gesture does, as plain numbers. Each movement is optional, and all
 * of them start and end at rest. Turns are about the part's own origin (a
 * pet's feet), in radians; heights in model units.
 */
export interface Move {
  /** How long the whole gesture takes, in seconds. */
  seconds: number
  /** How many times in that time it goes and comes back: hops, wiggles, nods. */
  beats: number
  /** How high it hops at the top of each beat. */
  lift?: number
  /** How far it rocks from side to side (about its front-to-back axis), to one side and back to the other each beat, settling as it ends. */
  rock?: number
  /** How far it leans forward (about its side-to-side axis) on each beat. */
  bow?: number
  /** How far it turns about the upright, out and back once over the whole gesture: a look round. */
  turn?: number
}

/** Where a gesture holds its part at one moment: lifted by `lift`, turned by `rock` (z), `bow` (x) and `turn` (y). */
export interface Pose {
  lift: number
  rock: number
  bow: number
  turn: number
}

/** Still. */
export const REST: Readonly<Pose> = Object.freeze({ lift: 0, rock: 0, bow: 0, turn: 0 })

/**
 * The pose `t` of the way through `move` (0 at its start, 1 at its end). At
 * rest at both ends, and outside them, so it never jumps in or out of a still
 * landmark. A hop is an arc a beat, never below where it rests.
 */
export function gesturePose(move: Move, t: number): Pose {
  if (!(t > 0 && t < 1)) return { ...REST }
  const beats = Math.max(1, Math.round(move.beats))
  const each = Math.abs(Math.sin(Math.PI * beats * t))
  return {
    lift: (move.lift ?? 0) * each,
    rock: (move.rock ?? 0) * Math.sin(2 * Math.PI * beats * t) * (1 - t),
    bow: (move.bow ?? 0) * each,
    turn: (move.turn ?? 0) * Math.sin(Math.PI * t),
  }
}
