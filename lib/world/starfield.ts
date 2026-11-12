import { Matrix4, Quaternion, Vector3 } from 'three'
import { night, type LinearRgb } from '@/content/sky'
import type { Constellation, District, Place } from '@/content/types'
import { FOCUS, MODEL_SCALE } from './camera'
import { dirOf, surfaceFrame } from './geo'
import { footprintRadius } from './kit'
import { groundOf } from './terrain'
import type { Quality } from './quality'
import { WORLD_SEED, mulberry32 } from './rng'

/** The stars sit on a sphere this far from the centre: inside the sky dome, well beyond the clouds. */
export const SKY_RADIUS = 40

/** One entry per star: three numbers each for position and colour, one each for size (in pixels) and twinkle phase. */
export interface StarField {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
}

/** How many stars each layer has. Low quality has half of each. */
export function starCounts(quality: Quality): { scattered: number; band: number; dust: number } {
  return quality === 'high' ? { scattered: 1700, band: 2600, dust: 150 } : { scattered: 850, band: 1300, dust: 75 }
}

/** The Milky Way's axis: the band is the great circle square to it. */
const BAND_AXIS = new Vector3(0.35, 0.9, 0.25).normalize()
const BAND_E1 = new Vector3().crossVectors(BAND_AXIS, new Vector3(0, 0, 1)).normalize()
const BAND_E2 = new Vector3().crossVectors(BAND_AXIS, BAND_E1)
/** How far stars and dust stray either side of the band's middle line. */
const BAND_SPREAD = { stars: 0.2, dust: 0.14 }

/** Sizes in pixels at a pixel ratio of 1: a base and a random extra. */
const SIZE = { scattered: [1.6, 2.2], band: [1.2, 1.6], dust: [90, 120] } as const

/** A random direction, uniform enough for a sky; a draw too near the centre to have one is drawn again. */
export function anywhere(rand: () => number): Vector3 {
  const d = new Vector3()
  do d.set(rand() - 0.5, rand() - 0.5, rand() - 0.5)
  while (d.lengthSq() < 1e-6)
  return d.normalize()
}

/** A direction near the band: anywhere round it, pushed off it by a rough bell curve of the given spread. */
function nearBand(rand: () => number, spread: number): Vector3 {
  const a = rand() * Math.PI * 2
  const off = (rand() + rand() + rand() - 1.5) * spread
  return BAND_E1.clone()
    .multiplyScalar(Math.cos(a))
    .addScaledVector(BAND_E2, Math.sin(a))
    .addScaledVector(BAND_AXIS, off)
    .normalize()
}

/**
 * The night's star field, the same for the same seed: scattered stars in
 * cream, cool white and warm; the Milky Way's band; and, last of all, the
 * large faint dust behind the band, so a renderer can leave it off by drawing
 * fewer points. Every star sits on the sky sphere (`SKY_RADIUS`).
 */
export function buildStarField(seed: number, quality: Quality): StarField {
  const rand = mulberry32(seed)
  const counts = starCounts(quality)
  const n = counts.scattered + counts.band + counts.dust
  const field: StarField = {
    positions: new Float32Array(n * 3),
    colors: new Float32Array(n * 3),
    sizes: new Float32Array(n),
    phases: new Float32Array(n),
  }
  let i = 0
  const star = (d: Vector3, size: number, color: LinearRgb) => {
    field.positions.set([d.x * SKY_RADIUS, d.y * SKY_RADIUS, d.z * SKY_RADIUS], i * 3)
    field.colors.set(color, i * 3)
    field.sizes[i] = size
    field.phases[i] = rand() * Math.PI * 2
    i++
  }

  for (let k = 0; k < counts.scattered; k++) {
    const d = anywhere(rand)
    const w = rand()
    const tint = w > 0.8 ? night.starWarm : w < 0.25 ? night.starWhite : night.starCream
    star(d, SIZE.scattered[0] + rand() * SIZE.scattered[1], tint)
  }
  for (let k = 0; k < counts.band; k++) {
    star(nearBand(rand, BAND_SPREAD.stars), SIZE.band[0] + rand() * SIZE.band[1], night.starBand)
  }
  for (let k = 0; k < counts.dust; k++) {
    const d = nearBand(rand, BAND_SPREAD.dust)
    const size = SIZE.dust[0] + rand() * SIZE.dust[1]
    const mix = (c: 0 | 1 | 2) => night.dustFrom[c] + rand() * (night.dustTo[c] - night.dustFrom[c])
    star(d, size, [mix(0), mix(1), mix(2)])
  }
  return field
}

/** A constellation's figure units on the sky, at `SKY_RADIUS`; scaled with the radius so the figure keeps its angular size. */
const FIGURE_UNIT = 0.55 / SKY_RADIUS
/** The label hangs this far below the figure's middle, in the same scaled units. */
const LABEL_DROP = 2.7 / SKY_RADIUS

/**
 * A constellation's stars, in the plane square to its direction at `radius`
 * from the centre. Looked at through the planet from outside, as the camera
 * does, a figure's +x runs to the right and its +y runs up, so it reads as drawn.
 */
export function constellationPoints(c: Constellation, radius: number): Vector3[] {
  const d = dirOf(c.at)
  const { south, east } = surfaceFrame(d)
  const unit = FIGURE_UNIT * radius
  return c.points.map(([x, y]) =>
    d
      .clone()
      .multiplyScalar(radius)
      .addScaledVector(east, -x * unit)
      .addScaledVector(south, -y * unit),
  )
}

/** Where a constellation's name is pinned: centred, just under the figure. */
export function constellationAnchor(c: Constellation, radius: number): Vector3 {
  const d = dirOf(c.at)
  return d
    .clone()
    .multiplyScalar(radius)
    .addScaledVector(surfaceFrame(d).south, LABEL_DROP * radius)
}

/** One puff of a cloud: where it sits in the cloud and how it is squashed, in the cloud's own units. */
export interface Puff {
  position: [number, number, number]
  scale: [number, number, number]
}

/** A puff is a sphere squashed to these proportions of its width: a little shorter, and shallow. */
const PUFF_SHAPE = { height: 0.84, depth: 0.62 }

/**
 * A cumulus cloud as puffs of one sphere: a flat base of five in a row on
 * y = 0, then `puffs` more stacked up to `tall` above it, narrowing and
 * shrinking as they rise. Draws from `rand`, so the same generator state gives
 * the same cloud.
 */
export function cumulus(rand: () => number, puffs: number, tall: number): Puff[] {
  const out: Puff[] = []
  const add = (x: number, y: number, z: number, r: number) =>
    out.push({ position: [x, y, z], scale: [r, r * PUFF_SHAPE.height, r * PUFF_SHAPE.depth] })
  for (let i = -2; i <= 2; i++) add(i * 0.85, 0, 0, 0.78 - Math.abs(i) * 0.1)
  for (let i = 0; i < puffs; i++) {
    const k = i / puffs
    const x = (rand() - 0.5) * 3.2 * (1 - k * 0.65)
    const z = (rand() - 0.5) * 0.5
    const r = (0.95 + (0.42 - 0.95) * k) * (0.8 + rand() * 0.45)
    add(x, 0.35 + k * tall, z, r)
  }
  return out
}

/** The seeds the drawn cloud layers use: each its own stream, apart from the stars' (`WORLD_SEED`). */
export const CLOUD_SEEDS = { far: WORLD_SEED + 1, low: WORLD_SEED + 2 } as const

/** How many far clouds ring the sky at each quality. */
export const FAR_CLOUDS: Record<Quality, number> = { high: 13, low: 7 }
/** How many small clouds drift low over the planet. */
export const LOW_CLOUDS = 8

/** A cloud: its place, turn and size in the world, and its puffs in its own units. */
export interface CloudLayout {
  matrix: Matrix4
  puffs: Puff[]
}

/** A low cloud also turns about the centre, on its own axis at its own speed (radians a second). */
export interface DriftingCloud extends CloudLayout {
  axis: Vector3
  speed: number
}

const ORIGIN = new Vector3()
const WORLD_UP = new Vector3(0, 1, 0)

/**
 * A cloud's transform at `position`: its face (+z) turned to the centre and
 * its top (+y) as near to world up as that allows, as `Object3D.lookAt` turns
 * anything but a camera, then scaled.
 */
function facingCentre(position: Vector3, scale: number): Matrix4 {
  const turn = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(ORIGIN, position, WORLD_UP))
  return new Matrix4().compose(position, turn, new Vector3(scale, scale, scale))
}

/**
 * Tall cumulus far behind the planet, the same on every visit: evenly round
 * the sky with a little jitter, mostly a little below the equator, 14 to 20
 * units out. That is beyond the furthest the camera zooms out, so a far cloud
 * never comes between the camera and the planet.
 */
export function farClouds(seed: number, quality: Quality): CloudLayout[] {
  const rand = mulberry32(seed)
  const count = FAR_CLOUDS[quality]
  const step = 360 / count
  return Array.from({ length: count }, (_, i) => {
    const puffs = rand()
    const tall = rand()
    const shape = cumulus(rand, 7 + Math.floor(puffs * 6), 1.4 + tall * 1.8)
    const lat = (rand() - 0.55) * 56
    const lon = i * step + rand() * 14
    const position = dirOf({ lat, lon }).multiplyScalar(14 + rand() * 6)
    return { matrix: facingCentre(position, 0.42 + rand() * 0.5), puffs: shape }
  })
}

/** The far clouds turn round the sky about the world's up this fast, in radians a second of the shared clock. */
export const FAR_DRIFT = 0.005

/**
 * Every puff of every far cloud as a sphere round it (its centre, and its
 * largest radius), as laid out before the drift turns them: what a far cloud
 * can hide behind it.
 */
export function farCloudSpheres(seed: number, quality: Quality): Array<{ centre: Vector3; radius: number }> {
  const m = new Matrix4()
  return farClouds(seed, quality).flatMap((cloud) =>
    cloud.puffs.map((puff) => {
      puffMatrix(cloud.matrix, puff, m)
      return { centre: new Vector3().setFromMatrixPosition(m), radius: m.getMaxScaleOnAxis() }
    }),
  )
}

/**
 * Small, flat-bottomed clouds just over the planet (1.19 to 1.24 from the
 * centre), lying on it with their puffs rising away from it. Each turns about
 * the centre on its own tilted axis, slowly.
 */
export function lowClouds(seed: number): DriftingCloud[] {
  const rand = mulberry32(seed)
  // Laid on the planet: the far clouds' turn, tipped a quarter turn back about x so +y points out.
  const layDown = new Matrix4().makeRotationX(-Math.PI / 2)
  return Array.from({ length: LOW_CLOUDS }, () => {
    const puffs = cumulus(rand, 3, 0.5)
    const scale = 0.034 + rand() * 0.018
    const dir = new Vector3()
    do dir.set(rand() - 0.5, (rand() - 0.5) * 0.8, rand() - 0.5)
    while (dir.lengthSq() < 1e-6)
    const position = dir.normalize().multiplyScalar(1.19 + rand() * 0.05)
    const axis = new Vector3(rand() - 0.5, 1.6, rand() - 0.5).normalize()
    const speed = 0.012 + rand() * 0.02
    return { matrix: facingCentre(position, scale).multiply(layDown), puffs, axis, speed }
  })
}

/*
 * Keeping the low clouds out of a place's view. The landmark's foot and top lie
 * on the place's own up axis, and its camera circles that axis at a fixed
 * distance and height (`FOCUS`). So everything a visitor at the place can see
 * the landmark's axis across, from any side, is a solid of revolution about the
 * axis: in any half-plane through it, the triangle from the eye to the
 * landmark's foot and top. A point's distance from that is its distance from
 * the triangle in its own half-plane, exactly, with no sampling of azimuths.
 *
 * The landmark is not a line up its axis: it fills its allowed footprint. A
 * point on the sight line from the eye to any part of it, `t` of the way
 * there, is within `t` of the footprint's radius of the sight line to the axis
 * at the same height. So the view is padded by the footprint's radius (`pad`):
 * a point that far clear of the triangle is clear of every sight line to the
 * landmark.
 */

/** How clear of the view a low cloud keeps: a margin past its reach, a wider berth round the camera itself, and the gap over which it fades. */
export const CLOUD_CLEAR = { margin: 0.015, near: 0.12, fade: 0.1 } as const

/**
 * What a visitor at a place sees the landmark across: the place's ground and
 * up, the eye's distance out and height, the landmark's height, and how far
 * its footprint reaches from its axis (`pad`), all in world units.
 */
export interface PlaceView {
  ground: Vector3
  up: Vector3
  back: number
  rise: number
  top: number
  pad: number
}

/** The view from a place's camera (`focusPose`), for keeping clouds out of it: padded by the place's allowed footprint (`footprintRadius`). */
export function placeView(place: Place, districts: District[], places: Place[]): PlaceView {
  const h = place.height * MODEL_SCALE
  return {
    ground: groundOf(place.at, districts),
    up: dirOf(place.at),
    back: FOCUS.back + FOCUS.backPerHeight * h,
    rise: FOCUS.up + FOCUS.upPerHeight * h,
    top: h,
    pad: footprintRadius(place.id, places) * MODEL_SCALE,
  }
}

/** Distance in a plane from (x, y) to the segment (ax, ay)–(bx, by). */
function toSegment2(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len)) : 0
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t))
}

/**
 * How far `p` is from what a visitor at the place can see the landmark across
 * (0 inside it): its distance from the view's triangle less the footprint's
 * radius (`pad`), or from the berth kept round the camera where that is
 * nearer. A cloud this far from the view, at its reach, neither cuts the sight
 * line to any part of the landmark nor crowds the camera.
 */
export function viewClearance(p: Vector3, view: PlaceView): number {
  const offset = p.clone().sub(view.ground)
  const z = offset.dot(view.up)
  const r = offset.addScaledVector(view.up, -z).length()
  const { back: b, rise: u, top: h } = view
  // Inside the triangle (eye, foot, top) in the half-plane: between the two edges from the eye, on the near side of the axis.
  const below = (b * z - u * r) / Math.hypot(b, u) // which side of the eye–foot edge
  const above = ((u - h) * r - b * (z - h)) / Math.hypot(b, u - h) // which side of the eye–top edge
  const inside = r >= 0 && below >= 0 && above >= 0 && r <= b
  const toTriangle = inside ? 0 : Math.min(toSegment2(r, z, b, u, 0, 0), toSegment2(r, z, b, u, 0, h), toSegment2(r, z, 0, 0, 0, h))
  const pad = Number.isFinite(view.pad) ? Math.max(0, view.pad) : 0
  const toEye = Math.hypot(r - b, z - u) - CLOUD_CLEAR.near
  return Math.max(0, Math.min(toTriangle - pad, toEye))
}

/**
 * The share of the way something easing into or out of a place's view (a
 * cloud shrinking, a route's dashes fading) moves in a frame `delta` seconds
 * long, at `rate` of the way a second: all of it at once under reduced motion
 * (`still`), so nothing animates then; none for a frame of no time or a bad one.
 */
export function easeShare(delta: number, rate: number, still: boolean): number {
  if (still) return 1
  const k = delta * rate
  return Number.isNaN(k) || !(delta > 0) || !(rate > 0) ? 0 : Math.min(1, k)
}

/** Over how much of a gap from a place's view a route's dash or a traveller fades back in. */
export const VIEW_FADE = 0.06

/**
 * How much of something thin at `p` (a route's dash, a traveller) shows at a
 * place: none in the view of the landmark or the berth round the camera,
 * fading back in over `VIEW_FADE`; away from a place (`view` null), all of it.
 */
export function viewFade(p: Vector3, view: PlaceView | null): number {
  if (!view) return 1
  const k = Math.min(1, Math.max(0, viewClearance(p, view) / VIEW_FADE))
  return k * k * (3 - 2 * k)
}

/** How far a low cloud reaches from its origin, its puffs included, in world units. */
export function cloudReach(cloud: CloudLayout): number {
  const scale = new Vector3().setFromMatrixScale(cloud.matrix).x
  return scale * Math.max(...cloud.puffs.map((p) => Math.hypot(...p.position) + Math.max(...p.scale)))
}

/**
 * Where a low cloud is at time `t` (seconds of the shared clock): turned on
 * its own axis as it drifts. At a place (`view`), a cloud whose reach would
 * come within `CLOUD_CLEAR.margin` of the view shrinks about its own origin,
 * to nothing where it would cut it (`scale` 0: it is not drawn), fading back
 * over `CLOUD_CLEAR.fade` as it drifts on; away from a place it is as it is.
 */
export function cloudAt(cloud: DriftingCloud, t: number, view: PlaceView | null): { matrix: Matrix4; scale: number } {
  const matrix = new Matrix4().makeRotationAxis(cloud.axis, t * cloud.speed).multiply(cloud.matrix)
  if (!view) return { matrix, scale: 1 }
  const centre = new Vector3().setFromMatrixPosition(matrix)
  const gap = viewClearance(centre, view) - cloudReach(cloud) - CLOUD_CLEAR.margin
  const k = Math.min(1, Math.max(0, gap / CLOUD_CLEAR.fade))
  const scale = k * k * (3 - 2 * k)
  if (scale < 1) matrix.multiply(new Matrix4().makeScale(scale, scale, scale))
  return { matrix, scale }
}

const NO_TURN = new Quaternion()
const puffPosition = new Vector3()
const puffScale = new Vector3()

/** One puff's world transform: the cloud's transform after the puff's own place and squash. Written into `out`. */
export function puffMatrix(cloud: Matrix4, puff: Puff, out = new Matrix4()): Matrix4 {
  out.compose(puffPosition.fromArray(puff.position), NO_TURN, puffScale.fromArray(puff.scale))
  return out.premultiply(cloud)
}
