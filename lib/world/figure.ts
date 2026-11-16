import { Euler, Quaternion, Vector3 } from 'three'
import type { Age, Build, Look } from '@/content/characters'
import type { Point2, Vec3 } from './kit'

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
 * camera. The body is one smooth, slim shape from the hips to the base of the
 * neck (`Torso`): square shoulders that slope to the neck, a flat chest, a
 * waist a little narrower, hips, and legs that taper to the ankle, the weight
 * on one leg (the figure's right, at -x), the other a little out and forward,
 * relaxed. Every build and age has the same flat-fronted body: a look differs
 * by its width, its shoulders, its hair and its clothes, never by a bust.
 */

/** How much wider each build is than an average one, through the shoulders, hips and limbs. */
export const BUILD_WIDTH: Record<Build, number> = { slim: 0.92, average: 1, broad: 1.1 }

/** How much wider still each build's shoulders and chest are than its hips: a broad build is broad at the shoulders. */
export const BUILD_SHOULDERS: Record<Build, number> = { slim: 1, average: 1, broad: 1.1 }

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
  kid: { height: 0.62, head: 0.34, body: (1 - 0.34) / (1 - 0.27), width: 1.04 },
  teen: { height: 0.88, head: 0.29, body: (1 - 0.29) / (1 - 0.27), width: 0.94 },
  adult: { height: 1, head: 0.27, body: 1, width: 1 },
  elder: { height: 0.96, head: 0.27, body: 1, width: 1 },
}

const ageOf = (look: Pick<Look, 'age'>) => AGE_BUILD[look.age ?? 'adult'] ?? AGE_BUILD.adult

/** A character's height in model units: an adult's, scaled by its age, and by its look's height (held between 0.9 and 1.1; anything else counts as 1). */
export function characterHeight(look: Pick<Look, 'height' | 'age'>): number {
  const k = Number.isFinite(look.height) ? Math.min(1.1, Math.max(0.9, look.height)) : 1
  return ADULT_HEIGHT * k * ageOf(look).height
}

/** How round the skull is (a `Rounded`'s `round`): nearly an egg. */
export const HEAD_ROUND = 1
/** How round the face is: an egg's, as the skull's, but shallower, so it meets the skull without an edge. */
export const FACE_ROUND = 1

/**
 * The body from the hips to the base of the neck, as one smooth shape: its
 * cross-section an ellipse [across, front to back] at each of `sections`,
 * which stand at equal steps of height from `from` (the first) to `to` (the
 * last). `sliceTorso` cuts a length of it for the builder to draw (the top's
 * cloth, the hips, a belt); `torsoAt` and `onTorso` say how wide it is at a
 * height and where its front is, for what is worn on it.
 */
export interface Torso {
  from: number
  to: number
  sections: Point2[]
}

/**
 * The torso's sections, bottom to top, as shares of the figure's height for an
 * average build: under the hips, the hips, the belt line, the waist, the ribs,
 * the chest, the shoulders, the base of the neck. The front is nearly flat
 * from the waist up (the depth hardly changes), on every figure.
 */
const TORSO_SECTIONS: Point2[] = [
  [0.15, 0.06],
  [0.196, 0.094],
  [0.194, 0.11],
  [0.182, 0.103],
  [0.19, 0.103],
  [0.212, 0.106],
  [0.228, 0.1],
  [0.09, 0.052],
]
/** Which of the sections are the chest and the shoulders: the ones a broad build widens (`BUILD_SHOULDERS`). */
const SHOULDER_SECTIONS = [5, 6]

/** The torso's cross-section [across, front to back] at height `y`, between its sections; its first or last beyond them. */
export function torsoAt(torso: Torso, y: number): Point2 {
  const last = torso.sections.length - 1
  const span = torso.to - torso.from
  const x = span > 0 ? Math.min(last, Math.max(0, ((y - torso.from) / span) * last)) : 0
  const i = Math.min(Math.floor(x), last - 1)
  const [a, b] = [torso.sections[i]!, torso.sections[i + 1]!]
  return [a[0] + (b[0] - a[0]) * (x - i), a[1] + (b[1] - a[1]) * (x - i)]
}

/**
 * A length of the torso from height `from` to `to`, `grow` larger all round
 * (cloth over it), as `count` cross-sections at equal steps: the path and
 * widths a `Swept` takes.
 */
export function sliceTorso(torso: Torso, from: number, to: number, grow = 0, count = 6): { path: Vec3[]; widths: Point2[] } {
  const n = Math.max(2, Math.round(count))
  const heights = Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1))
  return {
    path: heights.map((y): Vec3 => [0, y, 0]),
    widths: heights.map((y): Point2 => {
      const [w, d] = torsoAt(torso, y)
      return [w + grow * 2, d + grow * 2]
    }),
  }
}

/**
 * A point on the torso's front at height `y`, `x` of the way from its middle
 * to its side (-1 to 1), standing `proud` out of it (less than nothing:
 * sunk), and the turn that faces a small part's +Z out from it there: a
 * collar, a pattern on a shirt, a pocket.
 */
export function onTorso(torso: Torso, x: number, y: number, proud = 0): { at: Vec3; rot: Vec3 } {
  const [w, d] = torsoAt(torso, y)
  const share = Math.min(0.98, Math.max(-0.98, x))
  const [a, c] = [w / 2, d / 2]
  const px = share * a
  const pz = c * Math.sqrt(1 - share * share)
  // An ellipse's normal in the level plane.
  const [nx, nz] = [px / (a * a), pz / (c * c)]
  const k = Math.hypot(nx, nz) || 1
  return { at: [px + (nx / k) * proud, y, pz + (nz / k) * proud], rot: [0, Math.atan2(nx, nz), 0] }
}

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
  /**
   * The skull, and the face on its front (in the head's own frame, its middle at the origin): a shallower shape as
   * broad as the skull and standing a hair out of it, so the whole face looks toward the light and is lit evenly
   * from brow to chin, where the skull's own front would fall half into shade.
   */
  head: Part
  face: Part
  /** The neck, from the shoulders up into the head. */
  neck: { from: number; to: number; radius: number }
  /** The body as one shape, from under the hips to the base of the neck. */
  torso: Torso
  /** The room its parts take, top down: the chest (shoulders included), the waist, the hips; and the belt's height. */
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
  /** On the face (from the head's middle): the eyes across and up, and their size; the brows' height over the eyes; the nose's height; the mouth's height and width. */
  eyes: { x: number; y: number; size: number }
  brows: number
  nose: number
  mouth: { y: number; width: number }
}

/** A character's proportions, from its look's age, build and height. */
export function figureOf(look: Pick<Look, 'build' | 'height' | 'age'>): Figure {
  const H = characterHeight(look)
  const age = ageOf(look)
  // The body's heights, stretched or shrunk to the room the head leaves (exactly 1 for an adult).
  const b = age.body
  const w = (BUILD_WIDTH[look.build] ?? 1) * age.width
  const shoulders = BUILD_SHOULDERS[look.build] ?? 1
  const hh = H * age.head
  const head: Part = { at: [0, H - hh / 2, 0], size: [hh * 0.76, hh, hh * 0.86] }
  const face: Part = { at: [0, -hh * 0.03, hh * 0.86 * 0.2], size: [hh * 0.76 * 0.96, hh * 0.92, hh * 0.86 * 0.64] }
  const shoulderY = head.at[1] - hh / 2 - H * 0.012
  // The torso: its sections at equal steps from under the hips to the base of the neck, the shoulders' own two steps below that.
  const torso: Torso = {
    from: H * 0.462 * b,
    to: shoulderY - H * 0.008,
    sections: TORSO_SECTIONS.map(([across, depth], i): Point2 => [H * across * w * (SHOULDER_SECTIONS.includes(i) ? shoulders : 1), H * depth * w]),
  }
  const step = (torso.to - torso.from) / (torso.sections.length - 1)
  const sectionY = (i: number) => torso.from + step * i
  // The room a part takes: between two sections' heights, as broad and deep as the section that is its own.
  const part = (low: number, high: number, own: number): Part => {
    const [across, depth] = torso.sections[own]!
    return { at: [0, (sectionY(low) + sectionY(high)) / 2, 0], size: [across, sectionY(high) - sectionY(low), depth] }
  }
  const chest = part(4, 6, 6)
  const waist = part(2, 4, 3)
  const hips = part(0, 2, 1)
  const ankle = H * 0.07 * b
  const legX = H * 0.05 * w
  // A thigh is half the hips across where it leaves them, so the two fill the trousers from the belt down.
  const top = H * 0.05 * w
  const bottom = H * 0.029 * w
  const legs: [Limb, Limb] = [
    // The right leg straight under the hip, bearing the weight.
    { from: [-legX, sectionY(2), 0], to: [-legX * 0.95, ankle, 0], top, bottom },
    // The left a little out and forward, relaxed.
    { from: [legX, sectionY(2), 0], to: [legX * 1.35, ankle, H * 0.022], top, bottom },
  ]
  return {
    height: H,
    width: w,
    head,
    face,
    neck: { from: shoulderY - H * 0.02, to: head.at[1] - hh * 0.25, radius: H * 0.03 * Math.sqrt(w) },
    torso,
    chest,
    waist,
    hips,
    belt: sectionY(2),
    // The joint just inside the shoulders' widest, at their height: the arm's top fills the corner.
    shoulder: { x: torso.sections[6]![0] / 2 - H * 0.026 * w, y: sectionY(6) - H * 0.006 },
    legs,
    knee: H * 0.27 * b,
    foot: { size: [bottom * 2.5, H * 0.05, H * 0.135], forward: H * 0.035 },
    arm: { upper: H * 0.17 * b, fore: H * 0.155 * b, shoulder: H * 0.034 * w, elbow: H * 0.027 * w, wrist: H * 0.021 * w, hand: H * 0.027 },
    // Large eyes low on the face, the brows close over them, a small nose, a broad smile: a friendly face that reads at a glance.
    eyes: { x: hh * 0.17, y: -hh * 0.03, size: hh * 0.062 },
    brows: hh * 0.135,
    nose: -hh * 0.15,
    mouth: { y: -hh * 0.27, width: hh * 0.27 },
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
 * from the side; raised to wave, the forearm up beside the head; held out to
 * the side and a little behind, the open hand lifted, as a guide shows
 * what she stands beside; or bent, its hand in the trouser pocket at the
 * front of the hip. `side` is -1 for the figure's right (at -x), 1 for its left.
 */
export type ArmPose = 'down' | 'wave' | 'present' | 'pocket'

export function armPose(f: Figure, side: -1 | 1, pose: ArmPose): { shoulder: Vec3; elbow: Vec3; hand: Vec3 } {
  const shoulder: Vec3 = [side * f.shoulder.x, f.shoulder.y, 0]
  const { upper, fore } = f.arm
  if (pose === 'wave') {
    const elbow = plus(shoulder, [side * upper * 0.8, upper * 0.25, upper * 0.12])
    return { shoulder, elbow, hand: plus(elbow, [side * fore * 0.12, fore * 0.95, fore * 0.12]) }
  }
  if (pose === 'present') {
    const elbow = plus(shoulder, [side * upper * 0.78, -upper * 0.52, -upper * 0.32])
    return { shoulder, elbow, hand: plus(elbow, [side * fore * 0.82, fore * 0.38, -fore * 0.42]) }
  }
  if (pose === 'pocket') {
    const elbow = plus(shoulder, [side * upper * 0.38, -upper * 0.9, -upper * 0.12])
    const hand: Vec3 = [side * (f.hips.size[0] / 2 - f.arm.wrist * 0.8), f.hips.at[1] + f.hips.size[1] * 0.12, f.hips.size[2] * 0.32]
    return { shoulder, elbow, hand }
  }
  const elbow = plus(shoulder, [side * upper * 0.2, -upper * 0.98, -upper * 0.04])
  return { shoulder, elbow, hand: plus(elbow, [side * fore * 0.1, -fore * 0.99, fore * 0.12]) }
}
