import { Euler, Quaternion, Vector3 } from 'three'
import type { Age, Build, Look } from '@/content/characters'
import type { Vec3 } from './kit'

/*
 * A character's proportions, from its look: where every part of a standing
 * figure goes, in model units, built on its feet (the ground is y = 0) facing
 * +Z. Pure, so the builder (`components/world/models/Character.tsx`) only
 * draws, and the proportions are tested (tests/unit/world/figure.test.ts):
 * the feet on the ground, the head's top at the figure's height, every limb
 * joined to the body.
 *
 * The head is large for a body this size (about a quarter of the height, as
 * in Kylee's 8-bit portrait), so the face and the hair read from the place
 * camera. The body has a shape: shoulders, a chest, a waist, hips, legs that
 * taper to the ankle, and the weight on one leg (the figure's right, at -x),
 * the other a little out and forward, relaxed.
 */

/** How much wider each build is than an average one, through the shoulders, hips and limbs. */
export const BUILD_WIDTH: Record<Build, number> = { slim: 0.88, average: 1, broad: 1.2 }

/**
 * An average adult's height, in model units: the one scale for every
 * character. A little over a cottage's door (0.3), under the alley's (0.42):
 * large enough to find among the huts and trees from a place's camera, still
 * believable beside a door (a stylised figure's head is large for its height).
 */
export const ADULT_HEIGHT = 0.35

/**
 * How each age is built, against an adult: its `height`; its head's `head`
 * share of that height (a kid's is clearly larger); `body`, how the heights
 * of the body below the head (the waist, the hips, the knees, the arms' reach)
 * stretch or shrink with the room the head leaves; and `width`, how much
 * stockier or slighter it is for its height. An adult is all ones (and the
 * head share the figure is drawn at), so an adult's figure is exactly what it
 * was before ages: Kylee's is pinned by a test. Ages are told apart by
 * proportions and clothes, never by a stoop.
 */
export const AGE_BUILD: Record<Age, { height: number; head: number; body: number; width: number }> = {
  kid: { height: 0.62, head: 0.34, body: (1 - 0.34) / (1 - 0.27), width: 1.12 },
  teen: { height: 0.88, head: 0.29, body: (1 - 0.29) / (1 - 0.27), width: 0.92 },
  adult: { height: 1, head: 0.27, body: 1, width: 1 },
  elder: { height: 0.96, head: 0.27, body: 1, width: 1.04 },
}

const ageOf = (look: Pick<Look, 'age'>) => AGE_BUILD[look.age ?? 'adult'] ?? AGE_BUILD.adult

/** A character's height in model units: an adult's, scaled by its age, and by its look's height (held between 0.9 and 1.1; anything else counts as 1). */
export function characterHeight(look: Pick<Look, 'height' | 'age'>): number {
  const k = Number.isFinite(look.height) ? Math.min(1.1, Math.max(0.9, look.height)) : 1
  return ADULT_HEIGHT * k * ageOf(look).height
}

/** How round the skull is (a `Rounded`'s `round`): nearly an egg. */
export const HEAD_ROUND = 1
/** How round the face is: flatter than the skull, so its front faces the light from brow to chin. */
export const FACE_ROUND = 0.9
/** How round the body's parts are. */
export const TORSO_ROUND = 0.55

/** A soft part of the body: its middle and size [width, height, depth]. */
export interface Part {
  at: Vec3
  size: Vec3
}

/** A tapering limb: from a point to a point, its radius at each end. */
export interface Limb {
  from: Vec3
  to: Vec3
  top: number
  bottom: number
}

export interface Figure {
  /** The figure's height: the top of its head. */
  height: number
  /** How much wider than average (`BUILD_WIDTH`). */
  width: number
  /** The skull, and the face set into its front (in the head's own frame, its middle at the origin). */
  head: Part
  face: Part
  /** The neck, from the shoulders up into the head. */
  neck: { from: number; to: number; radius: number }
  /** The body, top down: the chest (shoulders included), the waist, the hips; and the belt's height. */
  chest: Part
  waist: Part
  hips: Part
  belt: number
  /** Where the shoulders' joints are (the right one is at -x). */
  shoulder: { x: number; y: number }
  /** The legs, hip to ankle, the right (weight-bearing) first. */
  legs: [Limb, Limb]
  /** The knee's height. */
  knee: number
  /** A foot (a shoe): its size [width, height, length]; it stands under its leg's ankle and reaches this far forward of it. */
  foot: { size: Vec3; forward: number }
  /** The arms: the upper arm's and forearm's lengths, their radii at the shoulder, the elbow and the wrist, and the hand's. */
  arm: { upper: number; fore: number; shoulder: number; elbow: number; wrist: number; hand: number }
  /** On the face (from the head's middle): the eyes across and up, and their size; the brows' height; the mouth's height and width. */
  eyes: { x: number; y: number; size: number }
  brows: number
  mouth: { y: number; width: number }
}

/** A character's proportions, from its look's age, build and height. */
export function figureOf(look: Pick<Look, 'build' | 'height' | 'age'>): Figure {
  const H = characterHeight(look)
  const age = ageOf(look)
  // The body's heights, stretched or shrunk to the room the head leaves (exactly 1 for an adult).
  const b = age.body
  const w = (BUILD_WIDTH[look.build] ?? 1) * age.width
  const hh = H * age.head
  const head: Part = { at: [0, H - hh / 2, 0], size: [hh * 0.72, hh, hh * 0.88] }
  const face: Part = { at: [0, -hh * 0.08, hh * 0.88 * 0.27], size: [hh * 0.68, hh * 0.76, hh * 0.44] }
  const shoulderY = head.at[1] - hh / 2 - H * 0.012
  const chest: Part = { at: [0, shoulderY - H * 0.075 * b, 0], size: [H * 0.25 * w, H * 0.16 * b, H * 0.13 * w] }
  const waist: Part = { at: [0, H * 0.575 * b, 0], size: [H * 0.19 * w, H * 0.11 * b, H * 0.115 * w] }
  const hips: Part = { at: [0, H * 0.48 * b, 0], size: [H * 0.205 * w, H * 0.1 * b, H * 0.12 * w] }
  const ankle = H * 0.07 * b
  const legX = H * 0.05 * w
  const top = H * 0.058 * w
  const bottom = H * 0.033 * w
  const legs: [Limb, Limb] = [
    // The right leg straight under the hip, bearing the weight.
    { from: [-legX, H * 0.5 * b, 0], to: [-legX * 0.95, ankle, 0], top, bottom },
    // The left a little out and forward, relaxed.
    { from: [legX, H * 0.5 * b, 0], to: [legX * 1.45, ankle, H * 0.025], top, bottom },
  ]
  return {
    height: H,
    width: w,
    head,
    face,
    neck: { from: shoulderY - H * 0.02, to: head.at[1] - hh * 0.25, radius: H * 0.034 * Math.sqrt(w) },
    chest,
    waist,
    hips,
    belt: H * 0.522 * b,
    shoulder: { x: chest.size[0] / 2 - H * 0.024, y: shoulderY - H * 0.03 },
    legs,
    knee: H * 0.27 * b,
    foot: { size: [bottom * 2.4, H * 0.055, H * 0.15], forward: H * 0.04 },
    arm: { upper: H * 0.17 * b, fore: H * 0.155 * b, shoulder: H * 0.042 * w, elbow: H * 0.03 * w, wrist: H * 0.021 * w, hand: H * 0.029 },
    eyes: { x: hh * 0.15, y: hh * 0.03, size: hh * 0.043 },
    brows: hh * 0.19,
    mouth: { y: -hh * 0.21, width: hh * 0.15 },
  }
}

/** `w`'s sign times its size to the power `e`. */
const signedPow = (w: number, e: number) => Math.sign(w) * Math.abs(w) ** e

/**
 * A point on the front (+Z) of a `Rounded` of `size` and `round`, `x` across
 * and `y` up from its middle, sunk `sink` into it along its surface's normal,
 * and the turn that faces a small part's +Z out along that normal: an eye, a
 * mouth, a pattern on a shirt. (`Rounded` is a superellipsoid,
 * |x/a|^(2/e) + |y/b|^(2/e) + |z/c|^(2/e) = 1.)
 */
export function onRounded(size: Vec3, round: number, x: number, y: number, sink = 0): { at: Vec3; rot: Vec3 } {
  const [a, b, c] = size.map((s) => s / 2)
  const p = 2 / round
  const rest = Math.max(0, 1 - Math.abs(x / a) ** p - Math.abs(y / b) ** p)
  const z = c * rest ** (round / 2)
  // The gradient of the surface's equation, which points out of it.
  const normal = new Vector3((p / a) * signedPow(x / a, p - 1), (p / b) * signedPow(y / b, p - 1), (p / c) * signedPow(z / c, p - 1)).normalize()
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal))
  const at = new Vector3(x, y, z).addScaledVector(normal, -sink)
  return { at: at.toArray() as Vec3, rot: [turn.x, turn.y, turn.z] }
}

/** `a` moved by `by`. */
export const plus = (a: Vec3, by: Vec3): Vec3 => [a[0] + by[0], a[1] + by[1], a[2] + by[2]]

/**
 * An arm from the shoulder, its elbow and hand: hanging relaxed a little out
 * from the side; raised to wave, the forearm up beside the head; or bent, its
 * hand in the trouser pocket at the front of the hip. `side` is -1 for the
 * figure's right (at -x), 1 for its left.
 */
export function armPose(f: Figure, side: -1 | 1, pose: 'down' | 'wave' | 'pocket'): { shoulder: Vec3; elbow: Vec3; hand: Vec3 } {
  const shoulder: Vec3 = [side * f.shoulder.x, f.shoulder.y, 0]
  const { upper, fore } = f.arm
  if (pose === 'wave') {
    const elbow = plus(shoulder, [side * upper * 0.8, upper * 0.25, upper * 0.12])
    return { shoulder, elbow, hand: plus(elbow, [side * fore * 0.12, fore * 0.95, fore * 0.12]) }
  }
  if (pose === 'pocket') {
    const elbow = plus(shoulder, [side * upper * 0.38, -upper * 0.9, -upper * 0.12])
    const hand: Vec3 = [side * (f.hips.size[0] / 2 - f.arm.wrist * 0.8), f.hips.at[1] + f.hips.size[1] * 0.12, f.hips.size[2] * 0.32]
    return { shoulder, elbow, hand }
  }
  const elbow = plus(shoulder, [side * upper * 0.2, -upper * 0.98, -upper * 0.04])
  return { shoulder, elbow, hand: plus(elbow, [side * fore * 0.1, -fore * 0.99, fore * 0.12]) }
}
