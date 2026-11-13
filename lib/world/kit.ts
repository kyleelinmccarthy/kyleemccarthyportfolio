import { Color, Euler, Quaternion, Vector3 } from 'three'
import { ConvexHull, type Face } from 'three/examples/jsm/math/ConvexHull.js'
import type { Place } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { angleDeg, dirOf } from './geo'
import { mulberry32 } from './rng'

/**
 * The modelling kit's maths: footprint and outline rules, the shapes of the
 * parts as plain numbers, and the small helpers the parts share. The React
 * parts that draw these live in components/world/models/kit.tsx.
 *
 * Model units throughout: the ground at y = 0, +Y up, +Z the front.
 */

export type Vec3 = [number, number, number]
/** A point in a plane: for a profile, distance from the axis and height; for a plate, x and y. */
export type Point2 = [number, number]

/** Every landmark stays inside this: a circle of `radius` round its origin, and `height` tall. */
export const FOOTPRINT = { radius: 1.3, height: 2.6 } as const

/**
 * Outline widths in model units: `thickness` is the default for a scaled
 * shell (`outlineScale`), `max` the most any part may ask for, and `part` the
 * width the kit's parts draw. A landmark is seen close, so its parts' lines
 * are finer than the look test's, about a pixel and a half at a place.
 */
export const OUTLINE = { thickness: 0.014, max: 0.02, part: 0.009 } as const

/**
 * Default bevel radii, in model units: a block's edges, the rims of round
 * parts and the corners of roofs, and the edges of thin shaped plates.
 */
export const BEVEL = { block: 0.04, round: 0.03, plate: 0.012 } as const

/**
 * The scale of a back-face outline shell round a compact convex part of
 * `radius`: big enough to stand `thickness` proud of it, never more than
 * `OUTLINE.max`. A degenerate radius gets no shell (1); a bad thickness the
 * default.
 */
export function outlineScale(radius: number, thickness: number = OUTLINE.thickness): number {
  const t = Number.isFinite(thickness) && thickness > 0 ? Math.min(thickness, OUTLINE.max) : OUTLINE.thickness
  if (!(radius > 0) || !Number.isFinite(radius)) return 1
  return 1 + t / radius
}

/**
 * Lines on small parts: a part at least `fullAt` across has the full line
 * (`OUTLINE.part`); a smaller one a thinner line, in three named `steps`
 * (shares of the full line), so a landmark's lines are at most three merged
 * draws. A part at least `mediumFrom` of `fullAt` across takes the medium
 * line, a smaller one the fine. A knob, a rail post or a cat is not drawn as
 * heavily as a wall.
 */
export const LINE = { fullAt: 0.1, mediumFrom: 0.55, steps: { fine: 0.4, medium: 0.7, full: 1 } } as const

/**
 * The outline width for a part whose bounding box is `size` (its three
 * extents): by its breadth, the middle extent, so a long thin post counts as
 * thin and a broad thin slab as broad; always one of the three `LINE.steps`.
 * Sizes that are not numbers give the full width.
 */
export function lineWidth(size: readonly number[]): number {
  const extents = size.filter((s) => Number.isFinite(s)).map((s) => Math.max(0, s)).sort((a, b) => a - b)
  if (extents.length === 0 || extents.length < size.length) return OUTLINE.part
  const k = extents[Math.floor((extents.length - 1) / 2)] / LINE.fullAt
  const step = k >= 1 ? LINE.steps.full : k >= LINE.mediumFrom ? LINE.steps.medium : LINE.steps.fine
  return OUTLINE.part * step
}

/**
 * True when `point`, in a landmark's own model units, is inside the footprint
 * rule: within its radius of the origin across the ground, between the ground
 * and its height. An outline's width over is allowed.
 */
export function withinFootprint(point: Vector3, radius: number = FOOTPRINT.radius): boolean {
  const slack = OUTLINE.max
  return (
    Math.hypot(point.x, point.z) <= radius + slack &&
    point.y >= -slack &&
    point.y <= FOOTPRINT.height + slack
  )
}

/**
 * How many sides a round part of `radius` needs to look smooth up close
 * without wasting triangles: a pot gets about 15, a tower 20, a big dome 40.
 */
export function roundSides(radius: number): number {
  const r = Number.isFinite(radius) ? Math.max(radius, 0) : 0
  return Math.min(40, Math.max(12, Math.round(12 + r * 40)))
}

/**
 * How finely a `Blob` of `radius` (its largest axis) is drawn: `across`
 * segments round and `down` from pole to pole. A small ball (a knob, a nose,
 * a flower) is 8 by 8, 112 triangles, which is as round as it looks at its
 * size; detail grows with size up to `roundSides`, so a big ball is as smooth
 * as any round part.
 */
export function blobSegments(radius: number): { across: number; down: number } {
  const r = Number.isFinite(radius) ? Math.max(radius, 0) : 0
  const across = Math.max(8, Math.min(roundSides(r), Math.round(8 + Math.max(0, r - BLOB_DETAIL.small) * BLOB_DETAIL.perUnit)))
  return { across, down: Math.max(8, Math.round(across * 0.7)) }
}

/** Balls up to `small` round are drawn at the least detail; past it, `perUnit` more segments a model unit. */
export const BLOB_DETAIL = { small: 0.02, perUnit: 120 } as const

/* ───────────── painted surfaces, glass and the contact shadow ───────────── */

/** Hermite step from 0 at `a` to 1 at `b`, as GLSL's `smoothstep` with `a` < `b`. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The painted height gradient on kit surfaces: at the ground a colour is
 * multiplied by `low` (a little deeper and cooler), and over `span` model units
 * it rises to being lifted `high` of the way to white. About 7 percent end to
 * end, and never brighter than white, so it never feeds the bloom.
 */
export const PAINT = { low: [0.94, 0.95, 0.985] as Vec3, high: 0.035, span: 2.2 } as const

/** A colour (linear, 0..1) as the painted gradient leaves it at `height` model units above the ground. */
export function paintColour(rgb: Vec3, height: number): Vec3 {
  const t = Number.isFinite(height) ? Math.min(1, Math.max(0, height / PAINT.span)) : 0
  return rgb.map((c, i) => {
    const low = c * PAINT.low[i]
    const high = c + (1 - c) * PAINT.high
    return low + (high - low) * t
  }) as Vec3
}

/**
 * Window glass follows the look's `glow`: by day (1) it is cool glass with
 * the sky in it, by night (2.3) the warm lit glow, and through dusk (1.5) it is
 * part way between. `shadeTop` is how much darker the bottom of a pane is than
 * its top; the highlight band runs corner to corner.
 */
export const GLASS = { dayGlow: 1, nightGlow: 2, bottom: 0.8, band: { width: 0.24, offset: 0.25, strength: 0.55 } } as const

/** How far a pane has turned from day glass to lit glow, 0..1, for the look's `glow`. */
export function glassNight(glow: number): number {
  return Number.isFinite(glow) ? smoothstep(GLASS.dayGlow, GLASS.nightGlow, glow) : 0
}

/**
 * Each vertex's place across a pane `size` [width, height] centred on the
 * origin, from -1 to 1 on each axis: the glass's own coordinates, which stay
 * the same when the pane is batched into a landmark.
 */
export function paneCoords(positions: Float32Array, [width, height]: [number, number]): Float32Array {
  const out = new Float32Array((positions.length / 3) * 2)
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    out[j] = width > 0 ? Math.max(-1, Math.min(1, positions[i] / (width / 2))) : 0
    out[j + 1] = height > 0 ? Math.max(-1, Math.min(1, positions[i + 1] / (height / 2))) : 0
  }
  return out
}

/**
 * The soft shadow under every landmark: `radius` by default (model units), lifted
 * a hair off the ground, solid out to `inner` of its radius and fading to
 * nothing at the edge. `day` and `night` are how strongly it darkens the
 * ground at full sun and with none.
 */
export const SHADOW = { share: 0.8, radius: FOOTPRINT.radius * 0.8, lift: 0.012, inner: 0.25, day: 0.6, night: 0.1, segments: 12 } as const

/**
 * The contact shadow's radius under a landmark whose footprint is `allowed`
 * round: `share` of it by default, or what the model asks for, but never past
 * the footprint, so two neighbours' shadows never overlap.
 */
export function shadowRadius(allowed: number, requested?: number): number {
  const wanted = requested !== undefined && Number.isFinite(requested) && requested > 0 ? requested : allowed * SHADOW.share
  return Math.min(wanted, allowed)
}

/** How much of the shadow is there `r` of the way from its middle to its edge: 1 inside `inner`, 0 at the edge and beyond. */
export function shadowFalloff(r: number): number {
  if (!Number.isFinite(r)) return 0
  return 1 - smoothstep(SHADOW.inner, 1, Math.abs(r))
}

/** How strongly the shadow darkens, from the look's sun strength (`sunK`: 1 by day, 0 at night). */
export function shadowStrength(sunK: number): number {
  const k = Number.isFinite(sunK) ? Math.min(1, Math.max(0, sunK)) : 0
  return SHADOW.night + (SHADOW.day - SHADOW.night) * k
}

/**
 * A round, flat shadow disc of `radius`, `segments` across, bent to lie on a
 * planet `planetRadius` model units round: its edge drops by r²/2R, so it
 * follows the ground rather than floating off it. Lifted `SHADOW.lift` at the
 * middle. uv runs 0..1 across it.
 */
export function shadowDisc(radius: number, segments: number, planetRadius: number): { positions: Float32Array; uvs: Float32Array; index: Uint32Array } {
  const n = segments + 1
  const positions = new Float32Array(n * n * 3)
  const uvs = new Float32Array(n * n * 2)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / segments
      const v = j / segments
      const x = (u * 2 - 1) * radius
      const z = (1 - v * 2) * radius
      const k = j * n + i
      positions.set([x, SHADOW.lift - (x * x + z * z) / (2 * planetRadius), z], k * 3)
      uvs.set([u, v], k * 2)
    }
  }
  const index = new Uint32Array(segments * segments * 6)
  let t = 0
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i
      // Wound to face up (+Y).
      index.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], t)
      t += 6
    }
  }
  return { positions, uvs, index }
}

/* ───────────── sharing geometry ───────────── */

/** Numbers to a tenth of a thousandth, so float noise does not split one shape into two. */
const keyNumber = (n: number) => String(Math.round(n * 1e4) / 1e4 || 0)

/**
 * The cache key of a shape: its kind and its parameters. Identical parts (the
 * same window on every floor) share one geometry through it.
 */
export function geometryKey(kind: string, ...params: Array<number | string | boolean | readonly number[]>): string {
  const parts = params.map((p) => {
    if (typeof p === 'number') return keyNumber(p)
    if (typeof p === 'string' || typeof p === 'boolean') return String(p)
    return `[${p.map(keyNumber).join(',')}]`
  })
  return [kind, ...parts].join('|')
}

/** How long a value built while rendering may wait to be held before it counts as abandoned, in milliseconds. */
const ORPHAN_MS = 10_000

/**
 * Values shared by key between the parts that use them. A part `peek`s while
 * rendering (building on first use), then `hold`s it once mounted and
 * `release`s it when unmounted.
 *
 * Freeing is never immediate. When the last user lets go, the value is freed
 * after the current task (`soon`), and only if nobody has taken it up by
 * then: in one commit a part can unmount while another with the same key
 * mounts, and React's strict mode unmounts and remounts every part, so a user
 * count of zero for a moment means nothing. A value built by a render that
 * never commits (no `hold` ever comes) is freed after a long wait (`later`), if
 * it is still unheld.
 */
export class SharedCache<T> {
  private readonly entries = new Map<string, { value: T; users: number }>()

  constructor(
    private readonly free: (value: T) => void,
    // Wrapped, not passed as they are: a browser's queueMicrotask throws "Illegal invocation" when called as a method of something else.
    private readonly soon: (task: () => void) => void = (task) => queueMicrotask(task),
    private readonly later: (task: () => void) => void = (task) => {
      setTimeout(task, ORPHAN_MS)
    },
  ) {}

  get size(): number {
    return this.entries.size
  }

  peek(key: string, build: () => T): T {
    const found = this.entries.get(key)
    if (found) return found.value
    const value = build()
    this.entries.set(key, { value, users: 0 })
    this.later(() => this.freeIfUnused(key, value))
    return value
  }

  hold(key: string, value: T): void {
    const found = this.entries.get(key)
    if (found && found.value === value) found.users++
    else if (!found) this.entries.set(key, { value, users: 1 })
  }

  release(key: string, value: T): void {
    const found = this.entries.get(key)
    if (!found || found.value !== value) return
    found.users = Math.max(0, found.users - 1)
    if (found.users === 0) this.soon(() => this.freeIfUnused(key, value))
  }

  /** Frees `value` if it is still the one under `key` and nobody holds it. */
  private freeIfUnused(key: string, value: T): void {
    const found = this.entries.get(key)
    if (!found || found.value !== value || found.users > 0) return
    this.entries.delete(key)
    this.free(value)
  }
}

/* ───────────── turned shapes ───────────── */

/** A profile with its outward normals, and how much each point is bevel (1) rather than flat face (0). */
export interface SoftProfile {
  points: Point2[]
  normals: Point2[]
  bevel: number[]
}

/** Arc segments for a quarter turn of a rounded corner. */
const ARC_STEPS = 3

const unit2 = (x: number, y: number): Point2 => {
  const l = Math.hypot(x, y)
  return l > 0 ? [x / l, y / l] : [0, 0]
}
/** The outward normal of a profile running bottom to top, on its right: (dy, -dx). */
const outward = (d: Point2): Point2 => [d[1], -d[0]]
const turnBy = (n: Point2, a: number): Point2 => [n[0] * Math.cos(a) - n[1] * Math.sin(a), n[0] * Math.sin(a) + n[1] * Math.cos(a)]

/**
 * Rounds every corner of a profile with a tangent arc of `radius` (less where
 * a segment is too short for it), and gives each point its true normal: the
 * straight runs stay flat, the arcs turn smoothly. A profile is a list of
 * (distance from the axis, height) running from bottom to top; where it
 * starts or ends on the axis at an angle (a cone's tip), the tip is rounded too.
 */
export function softProfile(points: Point2[], radius: number): SoftProfile {
  // A point repeated (a tube with no top) would make a segment of no length and no direction.
  const profile = points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-9)
  const out: SoftProfile = { points: [], normals: [], bevel: [] }
  const emit = (p: Point2, n: Point2, bevel: number) => {
    out.points.push(p)
    out.normals.push(n)
    out.bevel.push(bevel)
  }
  const last = profile.length - 1

  profile.forEach((p, i) => {
    const prev = i > 0 ? profile[i - 1] : null
    const next = i < last ? profile[i + 1] : null
    let u = prev ? unit2(p[0] - prev[0], p[1] - prev[1]) : null
    let v = next ? unit2(next[0] - p[0], next[1] - p[1]) : null
    let roomU = prev ? Math.hypot(p[0] - prev[0], p[1] - prev[1]) / 2 : 0
    let roomV = next ? Math.hypot(next[0] - p[0], next[1] - p[1]) / 2 : 0
    // An end on the axis meets its own mirror image there: round it as that corner, keeping our half.
    let half: 'start' | 'end' | null = null
    if (!u && v && Math.abs(p[0]) < 1e-9) {
      u = [v[0], -v[1]]
      roomU = roomV
      half = 'start'
    } else if (!v && u && Math.abs(p[0]) < 1e-9) {
      v = [u[0], -u[1]]
      roomV = roomU
      half = 'end'
    }
    if (!u || !v) {
      emit(p, outward((u ?? v)!), 0)
      return
    }

    const turn = Math.acos(Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1])))
    // Barely a corner: one point, its normal between the two sides'.
    if (turn < 1e-4) {
      const n = outward(unit2(u[0] + v[0], u[1] + v[1]))
      emit(p, unit2(n[0], n[1]), 0)
      return
    }
    // A hard corner (no radius) or one that doubles straight back, which no arc can round: the point twice,
    // once with each side's own normal, so the edge is crisp and no normal ever averages away to nothing.
    if (radius <= 0 || turn > Math.PI - 1e-3) {
      emit(p, outward(u), 0)
      emit([p[0], p[1]], outward(v), 0)
      return
    }
    // Left turns are convex (the arc's centre inside the solid), right turns concave.
    const side = Math.sign(u[0] * v[1] - u[1] * v[0])
    const tanHalf = Math.tan(turn / 2)
    const reach = Math.min(radius * tanHalf, roomU, roomV)
    const r = reach / tanHalf
    const n1 = outward(u)
    const t1: Point2 = [p[0] - u[0] * reach, p[1] - u[1] * reach]
    const centre: Point2 = [t1[0] - side * r * n1[0], t1[1] - side * r * n1[1]]
    let steps = Math.max(1, Math.ceil((turn / (Math.PI / 2)) * ARC_STEPS))
    if (half && steps % 2) steps++
    const from = half === 'start' ? steps / 2 : 0
    const to = half === 'end' ? steps / 2 : steps
    for (let k = from; k <= to; k++) {
      const n = turnBy(n1, (side * turn * k) / steps)
      const point: Point2 = [centre[0] + side * r * n[0], centre[1] + side * r * n[1]]
      // The point a half-corner ends on is the axis itself.
      if ((half === 'start' && k === from) || (half === 'end' && k === to)) point[0] = 0
      emit(point, n, k === 0 || k === steps ? 0 : 1)
    }
  })
  return out
}

/** A mesh as flat arrays: positions and normals by vertex, a bevel weight by vertex, and an optional index. */
export interface MeshData {
  positions: Float32Array
  normals: Float32Array
  bevel: Float32Array
  index?: Uint32Array
}

/**
 * Turns a profile round the Y axis in `sides` steps, the way a lathe does, with
 * the profile's own normals carried round. Angle 0 is the front (+Z). The seam
 * is doubled so each side keeps its own vertices.
 */
export function revolve(profile: SoftProfile, sides: number): MeshData {
  const n = profile.points.length
  const count = (sides + 1) * n
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const bevel = new Float32Array(count)
  for (let s = 0; s <= sides; s++) {
    const a = (s / sides) * Math.PI * 2
    const sin = s === sides ? 0 : Math.sin(a)
    const cos = s === sides ? 1 : Math.cos(a)
    for (let j = 0; j < n; j++) {
      const i = s * n + j
      const [x, y] = profile.points[j]
      const [nx, ny] = profile.normals[j]
      positions.set([x * sin, y, x * cos], i * 3)
      normals.set([nx * sin, ny, nx * cos], i * 3)
      bevel[i] = profile.bevel[j]
    }
  }
  const index = new Uint32Array(sides * (n - 1) * 6)
  let k = 0
  for (let s = 0; s < sides; s++) {
    for (let j = 0; j < n - 1; j++) {
      const a = s * n + j
      const b = (s + 1) * n + j
      index.set([a, b, a + 1, b, b + 1, a + 1], k)
      k += 6
    }
  }
  return { positions, normals, bevel, index }
}

/* ───────────── boxes ───────────── */

/** Each face of a box: its normal, and two axes across it whose cross product is the normal. */
const BOX_FACES: Array<[Vec3, Vec3, Vec3]> = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
]

/**
 * A box `size` centred on the origin with every edge chamfered by `radius`:
 * six flat faces, a strip across each edge and a triangle at each corner, 44
 * triangles. The strips and corners reuse the faces' normals, so their shading
 * turns smoothly from one face to the next (it reads as a rounded edge) and an
 * outline pushed along the normals has no cracks. Bevel is 1 on the strips
 * and corners, 0 on the faces. The radius never passes half the thinnest side.
 */
export function chamferedBox(size: Vec3, radius: number): MeshData {
  const half = size.map((s) => s / 2) as Vec3
  const r = Math.max(0, Math.min(radius, Math.min(...half) * 0.98))
  const positions: number[] = []
  const normals: number[] = []
  const bevel: number[] = []
  const index: number[] = []
  const at = (i: number) => new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  const normalOf = (i: number) => new Vector3(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2])
  const add = (p: Vector3, n: Vector3, b: number) => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
    bevel.push(b)
    return bevel.length - 1
  }
  /** A triangle (or a quad as two), wound to face along `out`. */
  const facing = (ids: number[], out: Vector3) => {
    const [a, b, c] = ids.map(at)
    const flip = b.clone().sub(a).cross(c.clone().sub(a)).dot(out) < 0
    const tri = (x: number, y: number, z: number) => index.push(...(flip ? [x, z, y] : [x, y, z]))
    tri(ids[0], ids[1], ids[2])
    if (ids.length === 4) tri(ids[0], ids[2], ids[3])
  }

  // The faces: each an inner rectangle, drawn in by the radius.
  const faces = BOX_FACES.map(([n, u, v]) => {
    const normal = new Vector3(...n)
    const across = new Vector3(...u)
    const up = new Vector3(...v)
    const extent = (axis: Vector3) => Math.abs(axis.dot(new Vector3(...half))) - r
    const centre = normal.clone().multiplyScalar(Math.abs(normal.dot(new Vector3(...half))))
    const ids = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => add(centre.clone().addScaledVector(across, a * extent(across)).addScaledVector(up, b * extent(up)), normal, 0))
    facing(ids, normal)
    return { normal, ids }
  })
  // A face's corners furthest toward a direction: the two along an edge, the one at a corner.
  const furthest = (face: (typeof faces)[number], toward: Vector3, count: number) =>
    [...face.ids].sort((x, y) => at(y).dot(toward) - at(x).dot(toward)).slice(0, count)
  // The strips and corners have vertices of their own, the same as the faces' but marked as bevel.
  const copy = (i: number) => add(at(i), normalOf(i), 1)

  // A strip across each edge, between the two faces that meet there.
  faces.forEach((a, i) =>
    faces.slice(i + 1).forEach((b) => {
      if (Math.abs(a.normal.dot(b.normal)) > 0.5) return
      const along = a.normal.clone().cross(b.normal)
      const [a0, a1] = furthest(a, b.normal, 2).sort((x, y) => at(x).dot(along) - at(y).dot(along))
      const [b0, b1] = furthest(b, a.normal, 2).sort((x, y) => at(x).dot(along) - at(y).dot(along))
      facing([copy(a0), copy(a1), copy(b1), copy(b0)], a.normal.clone().add(b.normal))
    }),
  )
  // A triangle at each corner, between the three faces that meet there.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner = new Vector3(sx, sy, sz)
        const three = faces.filter((f) => f.normal.dot(corner) > 0.5)
        facing(three.map((f) => copy(furthest(f, corner, 1)[0])), corner)
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    bevel: new Float32Array(bevel),
    index: new Uint32Array(index),
  }
}

/* ───────────── rounded convex shapes ───────────── */

export type RoofStyle = 'gable' | 'hip' | 'shed'

/**
 * The corners of a roof over walls `width` x `depth`, `height` from its eaves'
 * underside to its top, reaching `overhang` past the walls on every side. Its
 * eaves stand a `fascia` tall before the slopes begin. A gable's ridge runs
 * left to right, so a sloped face looks to the front and the gables to the
 * sides; a hipped roof slopes on all four sides (a pyramid over a square); a
 * lean-to rises from the front to the back.
 */
export function roofCorners(style: RoofStyle, [width, height, depth]: Vec3, overhang: number, fascia: number): Vector3[] {
  const x = width / 2 + overhang
  const z = depth / 2 + overhang
  const f = Math.min(Math.max(fascia, 0), height)
  const eaves = (zs: number[]) => zs.flatMap((zz) => [-x, x].flatMap((xx) => [new Vector3(xx, 0, zz), new Vector3(xx, f, zz)]))
  if (style === 'shed') {
    return [
      ...[-x, x].flatMap((xx) => [new Vector3(xx, 0, z), new Vector3(xx, f, z), new Vector3(xx, 0, -z)]),
      ...[-x, x].map((xx) => new Vector3(xx, height, -z)),
    ]
  }
  if (style === 'gable') return [...eaves([-z, z]), ...[-x, x].map((xx) => new Vector3(xx, height, 0))]
  // Hipped: the ridge is as long as the roof is wider than deep (or deeper than wide), a point over a square.
  const ridgeX = Math.max(x - z, 0)
  const ridgeZ = Math.max(z - x, 0)
  return uniquePoints([
    ...eaves([-z, z]),
    new Vector3(-ridgeX, height, -ridgeZ),
    new Vector3(ridgeX, height, ridgeZ),
  ])
}

/** Where one tile course goes: its middle, its size and its turn, as for a `Block`. */
export interface Course {
  at: Vec3
  size: Vec3
  rot: Vec3
}

/** The most tile courses a slope gets, whatever is asked for. */
export const MAX_COURSES = 40

/** Tile courses: how thick, how far past the gables, how much each overlaps the next, and how far its lower lip lifts (radians). */
const COURSE = { thickness: 0.024, reach: 0.012, overlap: 1.18, lift: 0.06 }

/**
 * Rows of tiles laid up the sloped faces of a gable or lean-to roof (the same
 * roof as `roofCorners`), `rows` to a slope, each a slat whose lower lip lifts
 * a little off the one below, so the courses read as steps with a line under
 * each. A hipped roof's slopes are not rectangles, so it gets none.
 */
export function roofCourses(style: RoofStyle, size: Vec3, overhangIn: number, fasciaIn: number, rowsIn: number): Course[] {
  // Every input made usable: sizes and overhang at least 0, the fascia no taller than the roof, a whole number of rows up to the cap.
  const [width, height, depth] = size.map(nonNegative)
  const overhang = nonNegative(overhangIn)
  const rows = Math.min(MAX_COURSES, Math.floor(nonNegative(rowsIn)))
  if (style === 'hip' || rows < 1) return []
  const x = width / 2 + overhang
  const z = depth / 2 + overhang
  const f = Math.min(nonNegative(fasciaIn), height)
  // A gable slopes from each eave to a ridge in the middle; a lean-to from the front eave to the back.
  const run = style === 'gable' ? z : 2 * z
  const rise = height - f
  const length = Math.hypot(run, rise)
  // A roof with no slope to it (no depth and no rise) has nowhere to lay tiles.
  if (length < 1e-6 || x < 1e-6) return []
  const pitch = Math.atan2(rise, run)
  const slopes = style === 'gable' ? [1, -1] : [1]
  return slopes.flatMap((side) =>
    Array.from({ length: rows }, (_, k) => {
      const s = ((k + 0.5) / rows) * length
      const lift = COURSE.thickness / 2 + 0.002
      // Up the slope from the eave, then out along its normal.
      const along = s / length
      const at: Vec3 = [
        0,
        f + rise * along + lift * (run / length),
        side * (z - run * along + lift * (rise / length)),
      ]
      return {
        at,
        size: [2 * (x + COURSE.reach), COURSE.thickness, (length / rows) * COURSE.overlap],
        rot: [side * (pitch - COURSE.lift), 0, 0],
      }
    }),
  )
}

/**
 * The corners of a straight-sided prism `height` tall, `sides` round, its
 * corners `bottom` and `top` from the axis (a top of 0 makes a pyramid), turned
 * so a flat face looks to the front.
 */
export function prismCorners(top: number, bottom: number, height: number, sides: number): Vector3[] {
  const ring = (r: number, y: number) =>
    Array.from({ length: sides }, (_, k) => {
      const a = ((k + 0.5) / sides) * Math.PI * 2
      return new Vector3(r * Math.sin(a), y, r * Math.cos(a))
    })
  return uniquePoints([...ring(bottom, 0), ...(top > 1e-9 ? ring(top, height) : [new Vector3(0, height, 0)])])
}

function uniquePoints(points: Vector3[]): Vector3[] {
  return points.filter((p, i) => points.findIndex((q) => q.distanceToSquared(p) < 1e-18) === i)
}

/** Directions round a sphere, for the rounding where three faces meet: an icosahedron's corners and the six axes. */
const SPHERE_DIRS: Vector3[] = (() => {
  const t = (1 + Math.sqrt(5)) / 2
  const corners = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => new Vector3(x, y, z))
  const axes = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => new Vector3(x, y, z))
  return [...corners, ...axes].map((d) => d.normalize())
})()

/** Steps across each rounded edge between two faces. */
const EDGE_STEPS = 3

function addDirection(dirs: Vector3[], d: Vector3): void {
  if (!dirs.some((e) => e.dot(d) > 1 - 1e-6)) dirs.push(d)
}

/**
 * The smallest rounding a hull or a turned part is given, whatever its bevel
 * says (unless it is thinner than this allows). With none, every sampling
 * direction lands on the same corner and the corners' normals are lost; with
 * this much, the edge still looks sharp and every normal is true.
 */
export const MIN_BEVEL = 0.002

/** A mesh with nothing in it: what a part too flat or too small to have a solid draws. */
function emptyMesh(): MeshData {
  return { positions: new Float32Array(0), normals: new Float32Array(0), bevel: new Float32Array(0) }
}

/** True when every number in a mesh is finite and every normal has length. */
function finiteMesh(mesh: MeshData): boolean {
  for (const v of mesh.positions) if (!Number.isFinite(v)) return false
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const l = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2])
    if (!(l > 0.5)) return false
  }
  return true
}

/**
 * The convex shape of `corners` with every edge and corner rounded to
 * `radius`, sized to the same bounds. Its normals are the true ones of the
 * rounded surface, so the faces shade flat and the edges turn smoothly, and
 * an outline pushed out along them stays the same width everywhere. Bevel is
 * 0 on the faces and 1 on the rounding.
 *
 * The radius is never less than `MIN_BEVEL` where the shape is thick enough,
 * so a bevel of 0 still gives true normals. A shape that is flat (no extent on
 * some axis), has fewer than four corners or a corner that is not a number
 * has no solid to round, and comes back empty rather than throwing.
 */
export function roundedHull(corners: Vector3[], radius: number): MeshData {
  if (corners.length < 4 || corners.some((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.z))) {
    return emptyMesh()
  }
  const box = { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) }
  for (const c of corners) {
    box.min.min(c)
    box.max.max(c)
  }
  const size = box.max.clone().sub(box.min)
  const thinnest = Math.min(size.x, size.y, size.z)
  if (!(thinnest > 1e-6)) return emptyMesh()
  const wanted = Number.isFinite(radius) ? radius : 0
  const r = Math.min(Math.max(wanted, MIN_BEVEL), 0.45 * thinnest)
  const middle = box.min.clone().add(box.max).multiplyScalar(0.5)
  // Draw the corners in by the radius on every axis, so the rounding brings the shape back out to its size.
  const shrink = new Vector3(1 - (2 * r) / size.x, 1 - (2 * r) / size.y, 1 - (2 * r) / size.z)
  const core = corners.map((c) => c.clone().sub(middle).multiply(shrink).add(middle))

  let faces: Face[]
  try {
    faces = new ConvexHull().setFromPoints(core).faces
  } catch {
    return emptyMesh()
  }
  if (faces.length < 4) return emptyMesh()
  const faceDirs: Vector3[] = []
  for (const face of faces) addDirection(faceDirs, face.normal.clone())
  const dirs = [...faceDirs]
  // Across each edge between two faces that meet at an angle, a few steps of the turn.
  const edgeOf = (face: Face) => {
    const out: Face[] = []
    let edge = face.edge
    do {
      if (edge.twin) out.push(edge.twin.face)
      edge = edge.next
    } while (edge !== face.edge)
    return out
  }
  for (const face of faces) {
    for (const other of edgeOf(face)) {
      const angle = face.normal.angleTo(other.normal)
      if (angle < 1e-4) continue
      for (let k = 1; k < EDGE_STEPS; k++) {
        const d = face.normal.clone().lerp(other.normal, k / EDGE_STEPS).normalize()
        addDirection(dirs, d)
      }
    }
  }
  for (const d of SPHERE_DIRS) addDirection(dirs, d.clone())

  // Each direction touches the core at its furthest corners; the surface is there, `r` further out.
  const info = new Map<Vector3, { normal: Vector3; bevel: number }>()
  const points: Vector3[] = []
  for (const d of dirs) {
    const reach = Math.max(...core.map((c) => c.dot(d)))
    const isFace = faceDirs.some((f) => f.dot(d) > 1 - 1e-9)
    for (const c of core) {
      if (c.dot(d) < reach - 1e-7) continue
      const p = c.clone().addScaledVector(d, r)
      points.push(p)
      info.set(p, { normal: d, bevel: isFace ? 0 : 1 })
    }
  }

  let hull: ConvexHull
  try {
    hull = new ConvexHull().setFromPoints(points)
  } catch {
    return emptyMesh()
  }
  const positions: number[] = []
  const normals: number[] = []
  const bevel: number[] = []
  for (const face of hull.faces) {
    let edge = face.edge
    do {
      const point = edge.head().point
      const at = info.get(point)
      positions.push(point.x, point.y, point.z)
      const n = at?.normal ?? face.normal
      normals.push(n.x, n.y, n.z)
      bevel.push(at?.bevel ?? 0)
      edge = edge.next
    } while (edge !== face.edge)
  }
  const mesh = { positions: new Float32Array(positions), normals: new Float32Array(normals), bevel: new Float32Array(bevel) }
  return finiteMesh(mesh) ? mesh : emptyMesh()
}

/* ───────────── the parts' meshes ───────────── */

/*
 * What each kit part draws, from its props, whatever they are: a part never
 * throws, and never hands the renderer a normal that is zero or not a number.
 * Sizes that are not numbers or below zero count as zero; a part with no
 * solid to it (no height, no width) draws nothing.
 */

const finiteOr = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback)
const nonNegative = (n: number) => Math.max(0, finiteOr(n, 0))

/** Round parts with this many sides or fewer are faceted prisms; more are turned smooth. */
export const MAX_FACETED_SIDES = 8

/** A side count a part can use: a whole number from 3 to 64, `fallback` if it is not a number. */
export function sideCount(sides: number, fallback: number): number {
  return Math.min(64, Math.max(3, Math.round(finiteOr(sides, fallback))))
}

/** A `Block`: a chamfered box. */
export function blockMesh(size: Vec3, bevel: number): MeshData {
  return chamferedBox(size.map(nonNegative) as Vec3, nonNegative(bevel))
}

/** A round part on the axis: faceted (a rounded hull of `prism`) up to `MAX_FACETED_SIDES`, turned from `profile` above. */
function roundMesh(profile: Point2[], prism: (sides: number) => Vector3[], sides: number, bevel: number): MeshData {
  const r = Math.max(nonNegative(bevel), MIN_BEVEL)
  return sides <= MAX_FACETED_SIDES ? roundedHull(prism(sides), r) : revolve(softProfile(profile, r), sides)
}

/** A `Tube`: a column `height` tall, `bottom` and `top` from the axis. */
export function tubeMesh(top: number, bottom: number, height: number, sides: number, bevel: number): MeshData {
  const [t, b, h] = [top, bottom, height].map(nonNegative)
  if (h < 1e-6 || Math.max(t, b) < 1e-6) return emptyMesh()
  const n = sideCount(sides, roundSides(Math.max(t, b)))
  return roundMesh([[0, 0], [b, 0], [t, h], [0, h]], (k) => prismCorners(t, b, h, k), n, bevel)
}

/** A `Peak`: a cone or pyramid `height` tall, `radius` at its base. */
export function peakMesh(radius: number, height: number, sides: number, bevel: number): MeshData {
  const [r, h] = [radius, height].map(nonNegative)
  if (h < 1e-6 || r < 1e-6) return emptyMesh()
  const n = sideCount(sides, roundSides(r))
  return roundMesh([[0, 0], [r, 0], [0, h]], (k) => prismCorners(0, r, h, k), n, bevel)
}

/**
 * A `Turned` part: `profile` turned on a lathe. Points that are not numbers
 * are dropped and none may cross the axis. A turned part is always smooth, so
 * it has at least `MAX_FACETED_SIDES + 1` sides: fewer, and neighbouring
 * normals would turn so far apart that the shading between them breaks (a
 * faceted shape is a `Tube` or a `Peak`).
 */
export function turnedMesh(profile: Point2[], sides: number, bevel: number): MeshData {
  const points = profile.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)).map(([x, y]) => [Math.max(0, x), y] as Point2)
  const widest = Math.max(0, ...points.map(([x]) => x))
  const ys = points.map(([, y]) => y)
  if (points.length < 2 || widest < 1e-6 || Math.max(...ys) - Math.min(...ys) < 1e-6) return emptyMesh()
  const n = Math.max(MAX_FACETED_SIDES + 1, sideCount(sides, roundSides(widest)))
  return revolve(softProfile(points, Math.max(nonNegative(bevel), MIN_BEVEL)), n)
}

/** A `Striped` part's gores: how many it has if not told, and the most. */
export const STRIPES = { gores: 8, most: 32 } as const

/** A gore count a striped part can use: an even number (so the colours alternate all the way round) from 2 to `STRIPES.most`. */
export function stripeCount(stripes: number): number {
  return Math.min(STRIPES.most, Math.max(2, Math.round(finiteOr(stripes, STRIPES.gores) / 2) * 2))
}

/**
 * A `Striped` part: `profile` turned on a lathe as a `Turned` part is
 * (`whole`), its surface parted into `stripes` gores (an even number,
 * `stripeCount`) running from bottom to top, alternately in `gores[0]` and
 * `gores[1]`, a gore of the first centred on the front (+Z): a circus tent's
 * canvas, a parasol, an awning. Its sides are a whole number for each gore
 * (as near `sides` as that allows, at most 64), so every border between two
 * gores runs straight up a seam of the lathe. The three share their vertices;
 * the gores split its triangles between them. A profile with nothing to turn
 * draws nothing.
 */
export function stripedMeshes(profile: Point2[], sides: number, bevel: number, stripes: number): { whole: MeshData; gores: [MeshData, MeshData] } {
  const count = stripeCount(stripes)
  const wanted = Math.max(MAX_FACETED_SIDES + 1, sideCount(sides, 16))
  const per = Math.max(1, Math.min(Math.ceil(wanted / count), Math.floor(64 / count)))
  const n = per * count
  const turned = turnedMesh(profile, n, bevel)
  if (!turned.index || turned.positions.length === 0) return { whole: emptyMesh(), gores: [emptyMesh(), emptyMesh()] }
  // Turned back half a gore, so the first gore is centred on the front rather than starting there.
  const [c, s] = [Math.cos(Math.PI / count), Math.sin(Math.PI / count)]
  const turn = (arr: Float32Array) => {
    const out = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 3) {
      const [x, y, z] = [arr[i], arr[i + 1], arr[i + 2]]
      out.set([x * c - z * s, y, z * c + x * s], i)
    }
    return out
  }
  const whole: MeshData = { positions: turn(turned.positions), normals: turn(turned.normals), bevel: turned.bevel, index: turned.index }
  // The lathe's triangles run side by side round it, the same number to each side.
  const each = turned.index.length / n
  const ids: [number[], number[]] = [[], []]
  for (let side = 0; side < n; side++) ids[Math.floor(side / per) % 2].push(...turned.index.subarray(side * each, (side + 1) * each))
  const gore = (k: 0 | 1): MeshData => ({ positions: whole.positions, normals: whole.normals, bevel: whole.bevel, index: Uint32Array.from(ids[k]) })
  return { whole, gores: [gore(0), gore(1)] }
}

/** A `Roof`'s body (its tile courses are `Block`s). */
export function roofMesh(style: RoofStyle, size: Vec3, overhang: number, fascia: number, bevel: number): MeshData {
  const [w, h, d] = size.map(nonNegative)
  return roundedHull(roofCorners(style, [w, h, d], nonNegative(overhang), nonNegative(fascia)), bevel)
}

/** The ridge cap's thickness, and about how much slope one tile course covers. */
const RIDGE = 0.05
const COURSE_LENGTH = 0.11

/** How many tile courses a slope gets when the roof does not say: one per `COURSE_LENGTH` of slope, at least three. */
export function defaultCourses(style: RoofStyle, size: Vec3, overhang: number): number {
  const [, height, depth] = size.map(nonNegative)
  if (style === 'hip') return 0
  const run = style === 'gable' ? depth / 2 + nonNegative(overhang) : depth + 2 * nonNegative(overhang)
  return Math.max(3, Math.round(Math.hypot(run, height) / COURSE_LENGTH))
}

/**
 * Everything a `Roof` draws: its body, its tile courses (`courses` to a slope,
 * or `defaultCourses`; capped at `MAX_COURSES`) and, on a gable, its ridge cap
 * (`ridge`), each tile and the cap placed as a `Block`. Every input is made
 * usable first, so any prop gives finite tiles or none.
 */
export function roofParts(
  style: RoofStyle,
  size: Vec3,
  overhang: number,
  fascia: number,
  bevel: number,
  courses: number | undefined,
  ridge: boolean,
): { body: MeshData; tiles: Course[]; cap: Course | null } {
  const [width, height, depth] = size.map(nonNegative)
  const reach = nonNegative(overhang)
  const clean: Vec3 = [width, height, depth]
  const rows = courses === undefined ? defaultCourses(style, clean, reach) : courses
  const span = width + 2 * reach
  const cap =
    style === 'gable' && ridge && span > 1e-6 && height > RIDGE
      ? { size: [span + 0.03, RIDGE, RIDGE] as Vec3, at: [0, height - RIDGE * 0.35, 0] as Vec3, rot: [Math.PI / 4, 0, 0] as Vec3 }
      : null
  return {
    body: roofMesh(style, clean, reach, fascia, bevel),
    tiles: roofCourses(style, clean, reach, fascia, rows),
    cap,
  }
}

/** Several meshes as one, each keeping its own vertices. */
function joinMeshes(meshes: MeshData[]): MeshData {
  const positions: number[] = []
  const normals: number[] = []
  const bevel: number[] = []
  const index: number[] = []
  for (const m of meshes) {
    const base = positions.length / 3
    const count = m.positions.length / 3
    positions.push(...m.positions)
    normals.push(...m.normals)
    bevel.push(...m.bevel)
    const ids = m.index ? Array.from(m.index) : Array.from({ length: count }, (_, i) => i)
    index.push(...ids.map((i) => i + base))
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), bevel: new Float32Array(bevel), index: new Uint32Array(index) }
}

/** How far an attic's apex stands under the roof slabs' underside, so the two never touch. */
const ATTIC_GAP = 0.006
/** The most a gable roof's slabs are rounded. */
export const GABLE_SLAB_BEVEL = 0.012

/** How deep the flat soffit under a gable roof's eave is: most of the fascia's height, never past the overhang (so it stays clear of the walls). */
export function gableSoffit(fascia: number, overhang: number): number {
  return Math.min(nonNegative(fascia) * 0.8, nonNegative(overhang))
}

/**
 * A gabled roof with gable walls (`Roof`'s `gable` option), over walls `size`
 * [width, rise, depth], reaching `overhang` past them: as a solid gable roof
 * outside, but built as two sloped `slabs`, each as thick as the `fascia`, so
 * it is hollow underneath; and an `attic`, a triangular prism exactly as wide
 * and deep as the walls, standing on their top and under the slabs, drawn in
 * the walls' colour. Under the overhang the gable ends then show wall, not
 * roof.
 */
export function gableRoofParts(size: Vec3, overhang: number, fascia: number, bevel: number): { slabs: MeshData; attic: MeshData } {
  const [w, h, d] = size.map(nonNegative)
  const o = nonNegative(overhang)
  const f = Math.min(nonNegative(fascia), h)
  const X = w / 2 + o
  const Z = d / 2 + o
  // A short flat soffit under each eave, so the eave's lower corner is not acute (rounding an acute corner pokes out of it).
  const soffit = gableSoffit(f, o)
  const slab = (side: number) =>
    roundedHull(
      [-X, X].flatMap((x) => [
        new Vector3(x, 0, side * Z),
        new Vector3(x, 0, side * (Z - soffit)),
        new Vector3(x, f, side * Z),
        new Vector3(x, h, 0),
        new Vector3(x, h - f, 0),
      ]),
      // A hull's rounding strays from a slanted face by a share of itself: kept small, so the underside stays true.
      Math.min(nonNegative(bevel), GABLE_SLAB_BEVEL),
    )
  const apex = Math.max(0, h - f - ATTIC_GAP)
  const attic = roundedHull(
    [-w / 2, w / 2].flatMap((x) => [new Vector3(x, 0, -d / 2), new Vector3(x, 0, d / 2), new Vector3(x, apex, 0)]),
    Math.min(nonNegative(bevel), 0.01),
  )
  return { slabs: joinMeshes([slab(1), slab(-1)]), attic }
}

/**
 * A place's `height` as a landmark built for `range` follows it: as it is
 * within the range, the nearest end of it outside (or the low end, if it is
 * not a number). A landmark states its range (`LandmarkComponent.heights`).
 */
export function heightWithin(height: number, [low, high]: readonly [number, number]): number {
  return Number.isFinite(height) ? Math.min(high, Math.max(low, height)) : low
}

/** The shape a picture is drawn at when its place does not give its size: a plain 4 by 3. */
export const PICTURE_ASPECT = 4 / 3

/**
 * A picture's width over its height from its size in pixels (`place.posterSize`),
 * so a landmark draws it at its own shape; a size that is missing or not two
 * positive numbers gives the plain `PICTURE_ASPECT`.
 */
export function pictureAspect(size?: readonly [number, number]): number {
  const [w, h] = size ?? [NaN, NaN]
  return w > 0 && h > 0 && Number.isFinite(w / h) ? w / h : PICTURE_ASPECT
}

/**
 * Parts stacked from `base` up, each `heights[k]` tall: where each starts,
 * and last where the stack ends. A tower built this way has its top where its
 * parts put it, never a hand-kept sum.
 */
export function stackUp(base: number, heights: number[]): number[] {
  const out = [base]
  for (const h of heights) out.push(out[out.length - 1] + h)
  return out
}

/** The highest point of a mesh: where the next part up stands. */
function meshTop(mesh: MeshData): number {
  let top = 0
  for (let i = 1; i < mesh.positions.length; i += 3) top = Math.max(top, mesh.positions[i])
  return top
}

/**
 * The true top of a `Peak` with these props: a little under its `height`,
 * since its tip is rounded. A pole, a spike or a finial stands on this.
 */
export function peakTop(radius: number, height: number, bevel: number = BEVEL.round, sides: number = roundSides(radius)): number {
  return meshTop(peakMesh(radius, height, sides, bevel))
}

/** The true top of a `Turned` part with these props (its last corner is rounded too). */
export function turnedTop(profile: Point2[], bevel: number = BEVEL.round * 0.6, sides: number = roundSides(Math.max(0, ...profile.map(([r]) => r)))): number {
  return meshTop(turnedMesh(profile, sides, bevel))
}

/**
 * A shaped plate's outline, depth and bevel made usable, or `null` if there is
 * no plate to draw: points that are not numbers and repeated points are
 * dropped, and it needs three points enclosing some area and some depth. The
 * bevel is kept under half the depth and a quarter of the plate's narrowest
 * side, so it never eats the shape.
 */
export function cleanPlate(shape: Point2[], depth: number, bevel: number): { shape: Point2[]; depth: number; bevel: number } | null {
  const points = shape
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 1e-9)
  const d = nonNegative(depth)
  if (points.length < 3 || d < 1e-4) return null
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    area += x1 * y2 - x2 * y1
  }
  if (Math.abs(area) / 2 < 1e-8) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const narrowest = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  return { shape: points, depth: d, bevel: Math.min(nonNegative(bevel), d * 0.45, narrowest / 4) }
}

/**
 * A `Blob`'s three radii (`body`) and its outline shell's (`shell`, `line` wider all round), or
 * `null` if it has no size on some axis (a ball squashed flat, or a radius
 * that is not a positive number), which would leave its shading with no
 * normals to work from.
 */
export function blobAxes(radius: number, squash: Vec3, line: number = OUTLINE.part): { body: Vec3; shell: Vec3 } | null {
  const body = squash.map((s) => nonNegative(radius) * nonNegative(s)) as Vec3
  if (body.some((a) => !(a > 1e-6) || !Number.isFinite(a))) return null
  return { body, shell: body.map((a) => a * outlineScale(a, line)) as Vec3 }
}

/* ───────────── each place's footprint and the triangle budget ───────────── */

/**
 * How far a place's landmark may reach from its middle, in model units: the
 * footprint's 1.3, or half the distance to its nearest neighbour if that is
 * less, so no two landmarks' footprints ever overlap. Distances are along the
 * ground at the planet's radius (1), which slightly understates them.
 */
export function footprintRadius(id: string, places: Place[]): number {
  const place = places.find((p) => p.id === id)
  if (!place) return FOOTPRINT.radius
  const nearest = Math.min(...places.filter((p) => p !== place).map((p) => angleDeg(dirOf(place.at), dirOf(p.at))))
  if (!Number.isFinite(nearest)) return FOOTPRINT.radius
  return Math.min(FOOTPRINT.radius, ((nearest * Math.PI) / 180 / MODEL_SCALE) / 2)
}

/** The nearest other place to `id`. */
function nearestPlace(id: string, places: Place[]): Place | undefined {
  const place = places.find((p) => p.id === id)
  if (!place) return undefined
  return places
    .filter((p) => p !== place)
    .reduce<Place | undefined>((best, p) => (!best || angleDeg(dirOf(place.at), dirOf(p.at)) < angleDeg(dirOf(place.at), dirOf(best.at)) ? p : best), undefined)
}

/** Every place's allowed footprint as a Markdown table, for the modelling README (a test keeps the two the same). */
export function footprintTable(places: Place[]): string {
  const rows = places.map((p) => {
    const r = footprintRadius(p.id, places)
    const near = nearestPlace(p.id, places)
    return `| ${p.name} (\`${p.id}\`) | ${r.toFixed(2)} | ${r < FOOTPRINT.radius && near ? `half the gap to ${near.name}` : 'the full footprint'} |`
  })
  return ['| Place | Allowed radius | Why |', '| --- | --- | --- |', ...rows].join('\n')
}

/**
 * The most triangles any one landmark may draw, its outlines included. The
 * development check warns above it.
 */
export const TRIANGLE_BUDGET = 24_000

/** The most all nineteen landmarks may draw together, counted over what each place shows. */
export const PLANET_TRIANGLE_BUDGET = 380_000

/**
 * The most draw calls any one landmark may make once batched (R40): one per
 * material its still parts use, plus each live part (a moving part, a
 * picture, water, rain). Fewer colours and line widths mean fewer calls.
 */
export const DRAW_BUDGET = 45

/** The most draw calls all nineteen landmarks may make together, counted over what each place shows. */
export const PLANET_DRAW_BUDGET = 760

/** Something with meshes in it, as three's scene graph has. */
interface MeshTree {
  traverse(visit: (object: { isMesh?: boolean; userData: Record<string, unknown>; geometry?: { index: { count: number } | null; getAttribute(name: string): { count: number } | undefined } }) => void): void
}

/** The triangles a landmark draws: every mesh under `root`, outlines included, leaving out batched copies of meshes already counted. */
export function triangleCount(root: MeshTree): number {
  let total = 0
  root.traverse((object) => {
    if (!object.isMesh || object.userData.batched || !object.geometry) return
    const position = object.geometry.getAttribute('position')
    total += object.geometry.index ? object.geometry.index.count / 3 : (position?.count ?? 0) / 3
  })
  return total
}

/* ───────────── shaped plates ───────────── */

/** A star of `points` points, `outer` and `inner` from its middle, the first point straight up. */
export function starOutline(points: number, outer: number, inner: number): Point2[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = (i / (points * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? outer : inner
    return [r * Math.sin(a), r * Math.cos(a)] as Point2
  })
}

/** A `width` x `height` rectangle round its middle with corners rounded to `radius`, anticlockwise. */
export function roundedRectOutline(width: number, height: number, radius: number, steps = ARC_STEPS): Point2[] {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const cx = width / 2 - r
  const cy = height / 2 - r
  const corners: Array<[number, number, number]> = [
    [cx, cy, 0],
    [-cx, cy, Math.PI / 2],
    [-cx, -cy, Math.PI],
    [cx, -cy, (3 * Math.PI) / 2],
  ]
  return corners.flatMap(([x, y, a0]) =>
    Array.from({ length: steps + 1 }, (_, k) => {
      const a = a0 + (k / steps) * (Math.PI / 2)
      return [x + r * Math.cos(a), y + r * Math.sin(a)] as Point2
    }),
  )
}

/**
 * An arch `width` wide and `height` tall standing on y = 0, centred on x = 0,
 * anticlockwise: square at its foot, a half circle at its head, in `steps`
 * steps round the head. Never shorter than its own head (half its width).
 */
export function archOutline(width: number, height: number, steps = 8): Point2[] {
  const r = nonNegative(width) / 2
  const h = Math.max(nonNegative(height), r)
  const n = Math.min(64, Math.max(2, Math.round(finiteOr(steps, 8))))
  const head = Array.from({ length: n + 1 }, (_, k) => {
    const a = (k / n) * Math.PI
    return [r * Math.cos(a), h - r + r * Math.sin(a)] as Point2
  })
  return [[-r, 0], [r, 0], ...head]
}

/**
 * An oval `rx` by `ry` round its middle, anticlockwise from +x, in `steps`
 * points: a pond seen from above, a plate, a disc. A `notch` (radians) cuts a
 * wedge out of it, centred on +x and reaching in to the middle: a lily pad.
 */
export function ellipseOutline(rx: number, ry: number, steps = 24, notch = 0): Point2[] {
  const [a, b] = [nonNegative(rx), nonNegative(ry)]
  const n = Math.min(128, Math.max(3, Math.round(finiteOr(steps, 24))))
  const gap = Math.min(Math.PI, nonNegative(notch))
  if (gap === 0) return Array.from({ length: n }, (_, k) => [a * Math.cos((k / n) * Math.PI * 2), b * Math.sin((k / n) * Math.PI * 2)] as Point2)
  const rim = Array.from({ length: n }, (_, k) => {
    const t = gap / 2 + (k / (n - 1)) * (Math.PI * 2 - gap)
    return [a * Math.cos(t), b * Math.sin(t)] as Point2
  })
  return [[0, 0], ...rim]
}

/** How many points a flower's outline takes for each petal. */
const PETAL_STEPS = 10

/**
 * A flower of `petals` rounded petals (a whole number from 3 to 12) round its
 * middle, anticlockwise from its first petal's tip straight up: each petal
 * reaches `outer` from the middle and is parted from the next at `inner`
 * (held between a tenth of `outer` and `outer`). The petals swell full and
 * round to their tips (`|cos|` to a power under 1), so it reads as a painted
 * flower, not a star. Nothing for an `outer` that is not a usable size.
 */
export function flowerOutline(petals: number, outer: number, inner: number): Point2[] {
  const r1 = finiteOr(outer, 0)
  if (!(r1 > 0) || !Number.isFinite(r1)) return []
  const n = Math.min(12, Math.max(3, Math.round(finiteOr(petals, 6))))
  const r0 = Math.min(r1, Math.max(r1 * 0.1, finiteOr(inner, 0)))
  const count = n * PETAL_STEPS
  return Array.from({ length: count }, (_, k) => {
    const t = (k / count) * Math.PI * 2
    const r = r0 + (r1 - r0) * Math.abs(Math.cos((n * t) / 2)) ** 0.6
    return [-r * Math.sin(t), r * Math.cos(t)] as Point2
  })
}

/**
 * A ribbon bow seen from the front, round its middle: two loops `width`
 * across and `height` tall either side of a pinched knot, from the knot's
 * upper right round the right loop, through the knot and round the left. A
 * pattern's bow, a gift's, a hair ribbon's (the Doll's, and the band's on
 * her collar). Nothing for a size that is not usable.
 */
export function bowOutline(width: number, height: number): Point2[] {
  const w = nonNegative(width) / 2
  const h = nonNegative(height) / 2
  if (!(w > 0 && h > 0) || !Number.isFinite(w + h)) return []
  return [
    [0.12 * w, 0.25 * h],
    [0.75 * w, h],
    [w, 0.55 * h],
    [w, -0.55 * h],
    [0.75 * w, -h],
    [0.12 * w, -0.25 * h],
    [-0.12 * w, -0.25 * h],
    [-0.75 * w, -h],
    [-w, -0.55 * h],
    [-w, 0.55 * h],
    [-0.75 * w, h],
    [-0.12 * w, 0.25 * h],
  ]
}

/**
 * A smile seen from the front: a thin crescent `width` across, `thick` toward
 * its middle and tapering to its upturned ends, round the middle of the
 * circle its arc is cut from (its lowest point 0.35 of `width` below it). A
 * face's mouth (the Doll's, and every character's). Nothing for a size that
 * is not usable.
 */
export function smileOutline(width: number, thick: number): Point2[] {
  const r = nonNegative(width) / 2
  const t = nonNegative(thick)
  if (!(r > 0 && t > 0) || !Number.isFinite(r + t)) return []
  const steps = 8
  // The lower edge: an arc from one upturned end round under the middle to the other.
  const lower = Array.from({ length: steps + 1 }, (_, k) => {
    const a = Math.PI * 1.15 + (k / steps) * Math.PI * 0.7
    return [r * Math.cos(a), r * 0.7 * Math.sin(a)] as Point2
  })
  // The upper edge, back along it, drawn in a little and lifted, thickest in the middle.
  const upper = lower
    .slice()
    .reverse()
    .map(([x, y]) => [x * 0.86, y * 0.86 + t * (1 - Math.abs(x) / r) + t * 0.35] as Point2)
  return [...lower, ...upper]
}

/* ───────────── rings, beams, water and flags ───────────── */

/**
 * A `Ring`: a hoop `thickness` thick whose tube runs round a circle `radius`
 * from the upright axis, lying flat with its middle at the origin: a rail, a
 * rim, a lifebuoy. `sides` steps round the tube, `around` round the hoop. The
 * tube never reaches the axis. All of it is round, so all of it catches the
 * edge light, at `RING_EDGE` of a bevel's strength: at full strength a ring
 * seen from above turns almost white. A ring with no radius or no thickness
 * draws nothing.
 */
export function ringMesh(radius: number, thickness: number, sides: number, around: number): MeshData {
  const R = nonNegative(radius)
  const r = Math.min(nonNegative(thickness) / 2, R * 0.9)
  if (R < 1e-6 || r < 1e-6) return emptyMesh()
  // Smooth all round: with fewer steps, neighbouring normals would turn so far apart that the shading between them breaks.
  const s = Math.max(6, sideCount(sides, 8))
  const m = Math.max(12, sideCount(around, roundSides(R) + 8))
  const count = (m + 1) * (s + 1)
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  for (let i = 0; i <= m; i++) {
    const a = (i / m) * Math.PI * 2
    const [ca, sa] = i === m ? [1, 0] : [Math.cos(a), Math.sin(a)]
    for (let j = 0; j <= s; j++) {
      const b = (j / s) * Math.PI * 2
      const [cb, sb] = j === s ? [1, 0] : [Math.cos(b), Math.sin(b)]
      const k = i * (s + 1) + j
      // Out from the hoop's circle: cb across the ground, sb up.
      normals.set([cb * sa, sb, cb * ca], k * 3)
      positions.set([(R + r * cb) * sa, r * sb, (R + r * cb) * ca], k * 3)
    }
  }
  const index = new Uint32Array(m * s * 6)
  let t = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < s; j++) {
      const a = i * (s + 1) + j
      const b = (i + 1) * (s + 1) + j
      index.set([a, b, a + 1, a + 1, b, b + 1], t)
      t += 6
    }
  }
  return { positions, normals, bevel: new Float32Array(count).fill(RING_EDGE), index }
}

/** How strongly a ring catches the edge light, as a share of a bevel's. */
export const RING_EDGE = 0.35

/** A `Swept`'s limits: the most steps along it and round it; and how strongly it catches the edge light, as a share of a bevel's (a ribbon is round all over, and much of that light would wash its colour out). */
export const SWEPT = { steps: 96, sides: 16, edge: 0.08 } as const

/** The point `t` of the way (0 to 1) along the smooth curve through `points` (a Catmull-Rom spline, its ends held). */
function alongCurve(points: Vector3[], t: number, into: Vector3): Vector3 {
  const last = points.length - 1
  const x = Math.min(Math.max(t, 0), 1) * last
  const i = Math.min(Math.floor(x), last - 1)
  const u = x - i
  const [p0, p1, p2, p3] = [points[Math.max(i - 1, 0)], points[i], points[i + 1], points[Math.min(i + 2, last)]]
  const blend = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u)
  return into.set(blend(p0.x, p1.x, p2.x, p3.x), blend(p0.y, p1.y, p2.y, p3.y), blend(p0.z, p1.z, p2.z, p3.z))
}

/**
 * A `Swept`: a soft ribbon whose middle runs along the smooth curve through
 * `path`, its cross-section an ellipse `widths[i]` ([across, thick]) at the
 * path's i-th point and shading smoothly between: a lock of hair, a scarf's
 * tail, a tail, a vine. Its thin side faces `facing` as nearly as the curve
 * allows, so a ribbon hanging down a head lies flat against it. Both ends are
 * closed; a width of nothing brings an end to a point. `sides` steps round
 * it, `steps` along it. Fewer than two points, a point that is not a number, or a
 * ribbon with no width anywhere draws nothing.
 */
export function sweptMesh(path: Vec3[], widths: Point2[], facing: Vec3, sides: number, steps: number): MeshData {
  const points = path.filter((p) => p.every(Number.isFinite)).map((p) => new Vector3(...p))
  if (points.length < 2 || points.length !== path.length || widths.length !== path.length) return emptyMesh()
  const s = Math.min(SWEPT.sides, Math.max(6, sideCount(sides, 8)))
  const m = Math.min(SWEPT.steps, Math.max(points.length - 1, sideCount(steps, (points.length - 1) * 3)))
  const half = widths.map(([w, d]) => [nonNegative(w) / 2, nonNegative(d) / 2] as Point2)
  if (!half.some(([a, b]) => a > 1e-6 && b > 1e-6)) return emptyMesh()
  const face = new Vector3(...facing)
  if (!(face.lengthSq() > 1e-12) || !facing.every(Number.isFinite)) face.set(0, 0, 1)
  face.normalize()

  const ring = s + 1
  const count = (m + 1) * ring + 2
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const [c, ahead, behind, T, N, B, n] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()]
  const lastN = new Vector3()
  const ends: Array<{ at: Vector3; out: Vector3 }> = []
  for (let i = 0; i <= m; i++) {
    const t = i / m
    alongCurve(points, t, c)
    T.copy(alongCurve(points, t + 0.5 / m, ahead)).sub(alongCurve(points, t - 0.5 / m, behind))
    if (!(T.lengthSq() > 1e-16)) T.set(0, -1, 0)
    T.normalize()
    // The thin side toward `facing`, square to the curve; where the curve runs along `facing`, as it was a step before.
    N.copy(face).addScaledVector(T, -face.dot(T))
    if (!(N.lengthSq() > 1e-6)) N.copy(lastN).addScaledVector(T, -lastN.dot(T))
    if (!(N.lengthSq() > 1e-6)) N.set(T.y, -T.x, 0)
    if (!(N.lengthSq() > 1e-6)) N.set(0, T.z, -T.y)
    lastN.copy(N.normalize())
    B.crossVectors(T, N)
    // Its width here, between the path's points.
    const x = t * (points.length - 1)
    const k = Math.min(Math.floor(x), points.length - 2)
    const a = half[k][0] + (half[k + 1][0] - half[k][0]) * (x - k)
    const b = half[k][1] + (half[k + 1][1] - half[k][1]) * (x - k)
    for (let j = 0; j <= s; j++) {
      const angle = (j / s) * Math.PI * 2
      const [ca, sa] = j === s ? [1, 0] : [Math.cos(angle), Math.sin(angle)]
      const v = (i * ring + j) * 3
      positions.set([c.x + a * ca * B.x + b * sa * N.x, c.y + a * ca * B.y + b * sa * N.y, c.z + a * ca * B.z + b * sa * N.z], v)
      // An ellipse's normal; on a ribbon drawn to a point, straight out from its middle.
      n.set(0, 0, 0).addScaledVector(B, b * ca).addScaledVector(N, a * sa)
      if (!(n.lengthSq() > 1e-16)) n.set(0, 0, 0).addScaledVector(B, ca).addScaledVector(N, sa)
      n.normalize()
      normals.set([n.x, n.y, n.z], v)
    }
    // Each end is closed by one point just past it, as far as the ribbon is thin there.
    if (i === 0) ends.push({ at: c.clone().addScaledVector(T, -Math.min(a, b)), out: T.clone().negate() })
    if (i === m) ends.push({ at: c.clone().addScaledVector(T, Math.min(a, b)), out: T.clone() })
  }
  const poles = [(m + 1) * ring, (m + 1) * ring + 1]
  ends.forEach(({ at, out }, e) => {
    positions.set([at.x, at.y, at.z], poles[e] * 3)
    normals.set([out.x, out.y, out.z], poles[e] * 3)
  })

  const index = new Uint32Array(m * s * 6 + s * 6)
  let w = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < s; j++) {
      const p = i * ring + j
      const q = p + ring
      index.set([p, q, p + 1, p + 1, q, q + 1], w)
      w += 6
    }
  }
  for (let j = 0; j < s; j++) {
    index.set([poles[0], j, j + 1, poles[1], m * ring + j + 1, m * ring + j], w)
    w += 6
  }
  const mesh = { positions, normals, bevel: new Float32Array(count).fill(SWEPT.edge), index }
  return finiteMesh(mesh) ? mesh : emptyMesh()
}

/**
 * How a lighthouse beam shows: by day a soft, pale shaft (`alpha` its
 * opacity at its strongest, `gain` its brightness), at night a stronger one
 * brighter than white, which blooms. Between the two through dusk, as the
 * look's `glow` rises, the way window glass turns.
 */
export const BEAM = { day: { alpha: 0.32, gain: 1 }, night: { alpha: 0.5, gain: 2.4 } } as const

/** The beam's opacity and brightness for the look's `glow`. */
export function beamStrength(glow: number): { alpha: number; gain: number } {
  const k = glassNight(glow)
  return {
    alpha: BEAM.day.alpha + (BEAM.night.alpha - BEAM.day.alpha) * k,
    gain: BEAM.day.gain + (BEAM.night.gain - BEAM.day.gain) * k,
  }
}

/**
 * A `Beam` of light: an open cone from its origin (the lamp) along +Z,
 * `length` long, `near` round at the lamp and `far` at its end, `sides` round,
 * with its normals square to its sides (the material fades it where it is
 * seen edge on). `along` is how far down the beam each vertex is, 0 at the
 * lamp and 1 at the end, for its fade. A beam with no length or no width
 * draws nothing.
 */
export function beamMesh(length: number, near: number, far: number, sides: number): MeshData & { along: Float32Array } {
  const [L, r0, r1] = [length, near, far].map(nonNegative)
  if (L < 1e-6 || Math.max(r0, r1) < 1e-6) return { ...emptyMesh(), along: new Float32Array(0) }
  // Smooth: with fewer sides, neighbouring normals would face apart.
  const n = Math.max(8, sideCount(sides, 16))
  const slope = (r1 - r0) / L
  const lean = 1 / Math.hypot(1, slope)
  const count = (n + 1) * 2
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const along = new Float32Array(count)
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const [c, s] = i === n ? [1, 0] : [Math.cos(a), Math.sin(a)]
    ;[r0, r1].forEach((r, end) => {
      const k = i * 2 + end
      positions.set([r * c, r * s, end * L], k * 3)
      normals.set([c * lean, s * lean, -slope * lean], k * 3)
      along[k] = end
    })
  }
  const index = new Uint32Array(n * 6)
  for (let i = 0; i < n; i++) {
    const a = i * 2
    index.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], i * 6)
  }
  return { positions, normals, bevel: new Float32Array(count), index, along }
}

/**
 * How a `Signal`'s rings of light go out. `rings` rings (at most `most`) leave
 * the mast evenly through one `period` (seconds), each growing steadily from
 * nothing to its full radius over the period. A ring fades in over the first
 * `rise` of its way out and fades to nothing from `fall` of the way to its
 * end, so it never appears or vanishes at once, and a ring's wrap from its
 * full size back to the mast is never seen. It is drawn as a soft line
 * `width` deep at its front (as shares of its full radius), with a fainter
 * glow `trail` deep trailing in behind it (`trailK` as strong). By day it is a
 * soft pale light (`alpha` its opacity at its strongest, `gain` its
 * brightness), at night a little brighter. Over the dark its brightest pixel
 * is `alpha × gain` of its colour (0.88 for white), under the bloom's
 * threshold; over something brighter, a lit window, blending mixes the two,
 * so a pixel there is never brighter than the brighter of that and the ring's
 * colour at its `gain`, and may bloom a little.
 *
 * What a pixel sees: a ring's front crossing it, from nothing to its strongest
 * in about `width × period` (0.44 s), then dimming more slowly; one such pulse
 * for each ring in each period. So a pixel sees a pulse every `period / rings`
 * seconds, and `most` is held so that is never under 2 s: at most half a pulse
 * a second, a sixth of WCAG 2.3.1's three flashes a second.
 */
export const SIGNAL = {
  rings: 3,
  // Four rings in an 8 s period is a pulse every 2 s, exactly the flash-rate test's limit: any change to `period` or
  // `most` needs that test (a pixel never sees a pulse more often than once every two seconds) read again.
  most: 4,
  period: 8,
  rise: 0.22,
  fall: 0.45,
  width: 0.055,
  trail: 0.18,
  trailK: 0.35,
  day: { alpha: 0.9, gain: 1 },
  night: { alpha: 0.55, gain: 1.6 },
} as const

/**
 * How far out a ring is at time `t`, from 0 (at the mast) to 1 (its full
 * radius): `ring` is its start as a share of the `period` (0 to 1). From the
 * clock wrapped to the period, as the shader has it; a clock or period that is
 * not a positive number holds the ring where it starts.
 */
export function signalAge(t: number, period: number, ring: number): number {
  const start = Number.isFinite(ring) ? ring : 0
  const k = (wrapTime(t, period) / (period > 0 && Number.isFinite(period) ? period : 1) + start) % 1
  return k < 0 ? k + 1 : k
}

/** How strongly a ring `age` of the way out shows: nothing at the mast and at its full size, rising and falling smoothly between. */
export function signalFade(age: number): number {
  if (!(age >= 0 && age <= 1)) return 0
  return smoothstep(0, SIGNAL.rise, age) * (1 - smoothstep(SIGNAL.fall, 1, age))
}

/**
 * How much of a ring `age` of the way out shows at `d` (a share of its full
 * radius) from its middle: 1 on its front, falling smoothly to nothing
 * `SIGNAL.width` beyond it, and as a fainter glow trailing `SIGNAL.trail` in
 * behind it. As the shader draws it.
 */
export function signalBand(d: number, age: number): number {
  if (!Number.isFinite(d) || !Number.isFinite(age)) return 0
  if (d >= age) return 1 - smoothstep(0, SIGNAL.width, d - age)
  const behind = age - d
  const line = 1 - smoothstep(0, SIGNAL.width, behind)
  const glow = SIGNAL.trailK * (1 - smoothstep(0, SIGNAL.trail, behind))
  return Math.max(line, glow)
}

/** The rings' opacity and brightness for the look's `glow`: from day to night as window glass turns. */
export function signalStrength(glow: number): { alpha: number; gain: number } {
  const k = glassNight(glow)
  return {
    alpha: SIGNAL.day.alpha + (SIGNAL.night.alpha - SIGNAL.day.alpha) * k,
    gain: SIGNAL.day.gain + (SIGNAL.night.gain - SIGNAL.day.gain) * k,
  }
}

/** How many rings a `Signal` asked for `rings` draws: a whole number from one to `SIGNAL.most`, `SIGNAL.rings` if not a number. */
export function signalRings(rings: number): number {
  return Math.min(SIGNAL.most, Math.max(1, Math.round(finiteOr(rings, SIGNAL.rings))))
}

/**
 * A `Signal`: one square for each of `rings` rings (one to `SIGNAL.most`),
 * `radius` out each way from its origin in its XY plane, facing +Z; the
 * shader turns each to face the camera and draws its ring on it. `corner` is
 * where each vertex is across its square (-1 to 1 on each axis), `ring` when
 * its ring leaves the mast, as a share of the period, spread evenly. A signal
 * with no radius draws nothing.
 */
export function signalMesh(radius: number, rings: number): MeshData & { corner: Float32Array; ring: Float32Array } {
  const r = nonNegative(radius)
  if (r < 1e-6) return { ...emptyMesh(), corner: new Float32Array(0), ring: new Float32Array(0) }
  const n = signalRings(rings)
  const positions = new Float32Array(n * 12)
  const normals = new Float32Array(n * 12)
  const corner = new Float32Array(n * 8)
  const ring = new Float32Array(n * 4)
  const index = new Uint32Array(n * 6)
  const corners: Point2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (let i = 0; i < n; i++) {
    corners.forEach(([x, y], c) => {
      const k = i * 4 + c
      positions.set([x * r, y * r, 0], k * 3)
      normals.set([0, 0, 1], k * 3)
      corner.set([x, y], k * 2)
      ring[k] = i / n
    })
    const a = i * 4
    index.set([a, a + 1, a + 2, a, a + 2, a + 3], i * 6)
  }
  return { positions, normals, bevel: new Float32Array(n * 4), index, corner, ring }
}

/**
 * Still water's painting: the sea colour turns to the shallows from
 * `shallows` of the way to the bank, and `rings` faint rings of glint drift
 * out across it at `speed` (of the way to the bank a second), as strong as
 * `ripple`, broken into arcs across the surface every `breakup` radians a
 * model unit (so the rings never read as a target), the arcs drifting at
 * `drift` radians a second. Water given a tint takes this share of it in its
 * middle.
 */
export const WATER = { shallows: 0.3, rings: 2, speed: 0.08, ripple: 0.24, breakup: 55, drift: 0.3, tint: 0.7 } as const

/**
 * How often water's two motions repeat, in seconds: its rings drift one ring
 * out every `1 / speed`, its arcs one turn every `2π / drift`. Each runs from
 * the shared clock wrapped to its own period, so the water stays smooth on a
 * page left open for days and drifts exactly as fast as before.
 */
export const WATER_PERIODS = { rings: 1 / WATER.speed, drift: (Math.PI * 2) / WATER.drift } as const

/**
 * A `Water` surface: the outline `shape` (seen from above, as x and z pairs)
 * filled flat at y = 0 and facing up, in `rings` rings from its middle (the
 * average of its points) out to its edge. The outline must be star-shaped
 * about its middle, as an oval or any convex outline is. `edge` is how near
 * the bank each vertex is, 0 in the middle and 1 on the outline, for the
 * shallows and the ripples. An outline with no area draws nothing.
 */
export function waterMesh(shape: Point2[], rings: number): MeshData & { edge: Float32Array } {
  const plate = cleanPlate(shape, 1, 0)
  if (!plate) return { ...emptyMesh(), edge: new Float32Array(0) }
  const outline = plate.shape
  const n = outline.length
  const k = Math.min(16, Math.max(1, Math.round(finiteOr(rings, 4))))
  const cx = outline.reduce((s, [x]) => s + x, 0) / n
  const cz = outline.reduce((s, [, z]) => s + z, 0) / n
  const count = 1 + k * n
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const edge = new Float32Array(count)
  positions.set([cx, 0, cz], 0)
  for (let ring = 1; ring <= k; ring++) {
    const f = ring / k
    outline.forEach(([x, z], i) => {
      const v = 1 + (ring - 1) * n + i
      positions.set([cx + (x - cx) * f, 0, cz + (z - cz) * f], v * 3)
      edge[v] = f
    })
  }
  for (let v = 0; v < count; v++) normals[v * 3 + 1] = 1
  const index: number[] = []
  const up = (a: number, b: number, c: number) => {
    const [ax, az, bx, bz, qx, qz] = [a, a, b, b, c, c].map((v, i) => positions[v * 3 + (i % 2 ? 2 : 0)])
    // The y of (b - a) × (c - a): positive faces up.
    const y = (bz - az) * (qx - ax) - (bx - ax) * (qz - az)
    index.push(...(y >= 0 ? [a, b, c] : [a, c, b]))
  }
  const ringAt = (ring: number, i: number) => (ring === 0 ? 0 : 1 + (ring - 1) * n + (i % n))
  for (let i = 0; i < n; i++) up(0, ringAt(1, i), ringAt(1, i + 1))
  for (let ring = 1; ring < k; ring++) {
    for (let i = 0; i < n; i++) {
      up(ringAt(ring, i), ringAt(ring + 1, i), ringAt(ring + 1, i + 1))
      up(ringAt(ring, i), ringAt(ring + 1, i + 1), ringAt(ring, i + 1))
    }
  }
  return { positions, normals, bevel: new Float32Array(count), index: new Uint32Array(index), edge }
}

/**
 * A flag's cloth: how thick it is, how many columns it is cut into along its
 * length (so it can bend), how many waves run along it, and the most a
 * ripple may be (`maxAmount` of its width deep) and how fast (`maxSpeed`,
 * radians a second).
 */
export const CLOTH = { thickness: 0.01, columns: 12, waves: 1, maxAmount: 0.4, maxSpeed: 8, fold: 0.16 } as const

/**
 * A `Flag`'s cloth: a thin slab `width` long and `height` deep, its hoist (the
 * top corner at the pole) at the origin, running along +X and hanging down,
 * cut into `columns` columns so the vertex shader can ripple it, every face
 * with its own flat normal. `grow` grows it all round, for its outline (drawn
 * on its back faces, as a shaped plate's is). `taper` (0 to 1; anything else
 * counts as the nearer, not a number as 0) narrows it toward the fly end, its
 * two long edges running straight in toward the middle of the hoist: a whole
 * taper makes a pennant coming to a point. A cloth with no width or height
 * draws nothing.
 */
export function clothMesh(width: number, height: number, columns: number, grow: number, taper = 0): MeshData {
  const [W, H] = [width, height].map(nonNegative)
  if (W < 1e-6 || H < 1e-6) return emptyMesh()
  const n = Math.min(32, Math.max(1, Math.round(finiteOr(columns, CLOTH.columns))))
  const g = nonNegative(grow)
  const t = CLOTH.thickness / 2 + g
  const narrow = Math.min(1, Math.max(0, finiteOr(taper, 0)))
  // The cloth's own columns, and for a grown copy one more at each end: its columns then fall exactly where the
  // cloth's do, so as the two ripple together the copy never pokes through between them.
  const own = Array.from({ length: n + 1 }, (_, i) => (W * i) / n)
  const xs = g > 0 ? [-g, ...own, W + g] : own
  // How far each long edge has come in toward the middle `x` along (none at the hoist, held beyond the cloth's ends).
  const inset = (x: number) => (H / 2) * narrow * Math.min(1, Math.max(0, x / W))
  const top = (x: number) => g - inset(x)
  const bottom = (x: number) => -H - g + inset(x)
  // The long edges' faces lean with the taper: their normals turn toward the fly end by its slope.
  const lean = new Vector3((H / 2) * narrow, W, 0).normalize()
  const positions: number[] = []
  const normals: number[] = []
  const index: number[] = []
  /** A strip of quads along the cloth's length: `corner(x, s)` for s = 0 and 1 is its two long edges. */
  const strip = (normal: Vec3, corner: (x: number, s: number) => Vec3) => {
    const base = positions.length / 3
    for (const x of xs) {
      for (const s of [0, 1]) {
        positions.push(...corner(x, s))
        normals.push(...normal)
      }
    }
    for (let i = 0; i < xs.length - 1; i++) facingQuad([base + i * 2, base + i * 2 + 1, base + i * 2 + 3, base + i * 2 + 2], normal)
  }
  const quad = (normal: Vec3, corners: Vec3[]) => {
    const base = positions.length / 3
    for (const c of corners) {
      positions.push(...c)
      normals.push(...normal)
    }
    facingQuad([base, base + 1, base + 2, base + 3], normal)
  }
  const at = (i: number) => new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  /** Two triangles of a quad, wound to face along `normal`. */
  const facingQuad = (ids: number[], normal: Vec3) => {
    const [a, b, c] = ids.map(at)
    const flip = b.clone().sub(a).cross(c.clone().sub(a)).dot(new Vector3(...normal)) < 0
    const tri = (x: number, y: number, z: number) => index.push(...(flip ? [x, z, y] : [x, y, z]))
    tri(ids[0], ids[1], ids[2])
    tri(ids[0], ids[2], ids[3])
  }
  strip([0, 0, 1], (x, s) => [x, s ? bottom(x) : top(x), t])
  strip([0, 0, -1], (x, s) => [x, s ? bottom(x) : top(x), -t])
  strip([lean.x, lean.y, 0], (x, s) => [x, top(x), s ? -t : t])
  strip([lean.x, -lean.y, 0], (x, s) => [x, bottom(x), s ? -t : t])
  const start = xs[0]
  quad([-1, 0, 0], [[start, top(start), t], [start, top(start), -t], [start, bottom(start), -t], [start, bottom(start), t]])
  // The fly end: none where it comes to a point.
  const end = xs[xs.length - 1]
  if (top(end) - bottom(end) > 1e-9) quad([1, 0, 0], [[end, top(end), t], [end, top(end), -t], [end, bottom(end), -t], [end, bottom(end), t]])
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    bevel: new Float32Array(positions.length / 3),
    index: new Uint32Array(index),
  }
}

/** A cloth's ripple, made usable: `amplitude` (model units), `speed` (radians a second) and the cloth's `width`. */
export interface ClothWave {
  amplitude: number
  speed: number
  width: number
}

/**
 * The ripple of a flag `width` long: `amount` of its width deep at the fly
 * end (at most `CLOTH.maxAmount`), running at `speed` (at most
 * `CLOTH.maxSpeed`). Anything that is not a usable number counts as none.
 */
export function clothWave(width: number, amount: number, speed: number): ClothWave {
  const w = nonNegative(width)
  const a = Math.min(CLOTH.maxAmount, Math.max(0, Number.isNaN(amount) ? 0 : amount))
  const s = Math.min(CLOTH.maxSpeed, Math.max(0, Number.isNaN(speed) ? 0 : speed))
  return { amplitude: w * a, speed: s, width: w }
}

/**
 * How a flag's folds are painted `x` along it at time `t`: a factor its colour
 * is multiplied by, from 1 down to `1 - CLOTH.fold`, following the ripple's
 * slope so the folds shade smoothly as the cloth turns. It only ever darkens
 * (so never feeds the bloom), and a still flag is one even colour. The cloth
 * is lit from its own flat normal, so the cel ramp's hard step never bands
 * across a fold; this soft shade carries the folds instead. The flag's shaders
 * do the same sum.
 */
export function clothFold(x: number, t: number, wave: ClothWave): number {
  if (!(wave.width > 0) || !(wave.amplitude > 0)) return 1
  const k = Math.min(1, Math.max(0, finiteOr(x, 0) / wave.width))
  const turns = Math.PI * 2 * CLOTH.waves
  const phase = turns * k - finiteOr(t, 0) * wave.speed
  // The ripple's slope along the cloth, d/dk of k·sin(phase), brought into -1..1.
  const slope = (Math.sin(phase) + k * turns * Math.cos(phase)) / (1 + turns)
  return 1 - CLOTH.fold * 0.5 * (slope + 1)
}

/**
 * How far the cloth stands out of its plane (along z) `x` along it at time
 * `t`: nothing at the hoist, growing toward the fly end, `CLOTH.waves` waves
 * along it running outward. The flag's vertex shader does the same sum; a
 * clock that stands still holds it still.
 */
export function clothOffset(x: number, t: number, wave: ClothWave): number {
  if (!(wave.width > 0)) return 0
  const k = Math.min(1, Math.max(0, finiteOr(x, 0) / wave.width))
  const phase = Math.PI * 2 * CLOTH.waves * k - finiteOr(t, 0) * wave.speed
  return wave.amplitude * k * Math.sin(phase)
}

/* ───────────── a flame, and a coin's drop ───────────── */

/**
 * A flame's teardrop, as a profile for a lathe (`turnedMesh`): from its foot on
 * the axis round a bulb `radius` wide, its middle `radius` up (or less, for a
 * flame shorter than two of its radius: two fifths of its height), then
 * narrowing in a long curve to its tip on the axis `height` up. Nothing for a
 * radius or height that is not a positive number.
 */
export function flameProfile(radius: number, height: number): Point2[] {
  const [r, h] = [radius, height].map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0))
  if (r < 1e-6 || h < 1e-6) return []
  const bulb = Math.min(r, h * 0.4)
  const below = [Math.PI / 6, Math.PI / 3, Math.PI / 2].map((a) => [r * Math.sin(a), bulb * (1 - Math.cos(a))] as Point2)
  // Above the bulb it narrows slowly, then quickly, then draws out to its tip: cos^1.6 of a quarter turn.
  const above = [0.2, 0.4, 0.6, 0.8].map((u) => [r * Math.cos((u * Math.PI) / 2) ** 1.6, bulb + (h - bulb) * u] as Point2)
  return [[0, 0], ...below, ...above, [0, h]]
}

/**
 * The same teardrop as a flat outline `width` wide and `height` tall, standing
 * on y = 0 round x = 0, anticlockwise, for an `Extruded` plate: a flame
 * emblem on a sign. Nothing for a size that is not a positive number.
 */
export function flameOutline(width: number, height: number): Point2[] {
  const profile = flameProfile(width / 2, height)
  if (profile.length === 0) return []
  const side = profile.slice(1, -1)
  // Up the right side to the tip, down the left, back to the foot.
  return [[0, 0], ...side, [0, profile[profile.length - 1][1]], ...side.slice().reverse().map(([x, y]) => [-x, y] as Point2)]
}

/**
 * How a `Flame` breathes: once every `period` seconds (never quicker than
 * one in two seconds), its height swelling and settling by `size` of itself
 * either way (its width by half as much) and its glow by `glow`, the glow a
 * little behind (`lag`, radians). Slow and small on purpose: a breath, never
 * a flicker or a flash (WCAG 2.3.1). Its brightness changes by at most
 * `glow × 2π / period` of itself a second (0.17).
 */
export const FLAME = { period: 3, size: 0.06, glow: 0.08, lag: 0.6 } as const

/**
 * A flame's breath at time `t` (the shared clock, wrapped to the period): its
 * `width`, `height` and `glow`, each a factor near 1. A clock that stands
 * still (reduced motion) holds it still; any clock that is not a number counts
 * as 0.
 */
export function flameBreath(t: number): { width: number; height: number; glow: number } {
  const k = (Math.PI * 2 * wrapTime(t, FLAME.period)) / FLAME.period
  return {
    width: 1 + FLAME.size * 0.5 * Math.sin(k),
    height: 1 + FLAME.size * Math.sin(k),
    glow: 1 + FLAME.glow * Math.sin(k - FLAME.lag),
  }
}

/**
 * A coin's drop into a slot, on a slow loop `period` seconds long, as shares
 * of the loop. It starts whole at the top, so a clock that never moves
 * (reduced motion) shows it there, about to drop; falls the whole way
 * smoothly over `fall` (into the slot, where the bank hides it); shrinks to
 * nothing over `vanish`, out of sight; goes back to the top at `reset` while
 * hidden; and grows again from nothing over `appear`, high above the slot.
 * Nothing pops: the only jump is made while it is hidden.
 */
export const DROP = { period: 5, fall: [0.1, 0.58], vanish: [0.66, 0.8], reset: 0.84, appear: [0.86, 0.98] } as const

/**
 * Where a dropping coin is at time `t` (the shared clock, wrapped to the
 * period): `down`, from 0 at the top to 1 at the foot of its fall, and
 * `scale`, 0 (hidden) to 1. A clock that stands still holds it still; any
 * clock that is not a number counts as 0, whole at the top.
 */
export function dropPose(t: number): { down: number; scale: number } {
  const k = wrapTime(t, DROP.period) / DROP.period
  if (k >= DROP.reset) return { down: 0, scale: smoothstep(DROP.appear[0], DROP.appear[1], k) }
  return { down: smoothstep(DROP.fall[0], DROP.fall[1], k), scale: 1 - smoothstep(DROP.vanish[0], DROP.vanish[1], k) }
}

/* ───────────── soft shapes: rounded boxes ───────────── */

/**
 * How finely a soft shape whose largest half-extent is `radius` is drawn:
 * `across` steps round it, a multiple of 4 so its rounded corners fall on a
 * step, from 12 to 40 as `roundSides` grows; `down` from pole to pole, half as
 * many.
 */
export function softSegments(radius: number): { across: number; down: number } {
  const across = Math.min(40, Math.max(12, Math.round(roundSides(radius) / 4) * 4))
  return { across, down: across / 2 }
}

/**
 * A closed surface round the upright axis, star-shaped about the origin:
 * `point(u, v)` for `u` from -π/2 (the bottom pole) to π/2 (the top) in `down`
 * steps, and `v` once round from the front (+Z) toward +X in `across` steps.
 * Each pole is one vertex and the seam is shared, so every normal is
 * continuous (an outline pushed along them has no crack). Normals are
 * `normal(u, v)` where given, else the average of the faces round each vertex,
 * by area. Every triangle faces away from the origin.
 */
function closedSurface(across: number, down: number, point: (u: number, v: number) => Vector3, normal?: (u: number, v: number) => Vector3): { positions: number[]; normals: number[]; index: number[] } {
  const positions: number[] = []
  const normals: number[] = []
  const add = (u: number, v: number) => {
    const p = point(u, v)
    positions.push(p.x, p.y, p.z)
    if (normal) {
      const n = normal(u, v)
      normals.push(n.x, n.y, n.z)
    }
  }
  add(-Math.PI / 2, 0)
  for (let j = 1; j < down; j++) for (let i = 0; i < across; i++) add(-Math.PI / 2 + (j / down) * Math.PI, (i / across) * Math.PI * 2)
  add(Math.PI / 2, 0)
  const top = positions.length / 3 - 1
  const ring = (j: number, i: number) => 1 + (j - 1) * across + (((i % across) + across) % across)
  const index: number[] = []
  const at = (k: number) => new Vector3(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2])
  const tri = (a: number, b: number, c: number) => {
    const [pa, pb, pc] = [a, b, c].map(at)
    const face = pb.clone().sub(pa).cross(pc.clone().sub(pa))
    const out = pa.clone().add(pb).add(pc)
    index.push(...(face.dot(out) < 0 ? [a, c, b] : [a, b, c]))
  }
  for (let i = 0; i < across; i++) {
    tri(0, ring(1, i), ring(1, i + 1))
    for (let j = 1; j < down - 1; j++) {
      tri(ring(j, i), ring(j + 1, i), ring(j + 1, i + 1))
      tri(ring(j, i), ring(j + 1, i + 1), ring(j, i + 1))
    }
    tri(top, ring(down - 1, i), ring(down - 1, i + 1))
  }
  if (!normal) {
    const sums = new Float32Array(positions.length)
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = [index[t], index[t + 1], index[t + 2]]
      const face = at(b).sub(at(a)).cross(at(c).sub(at(a)))
      for (const k of [a, b, c]) {
        sums[k * 3] += face.x
        sums[k * 3 + 1] += face.y
        sums[k * 3 + 2] += face.z
      }
    }
    for (let k = 0; k < sums.length; k += 3) {
      const n = new Vector3(sums[k], sums[k + 1], sums[k + 2])
      // A vertex with no area round it takes the way out from the middle.
      if (!(n.length() > 1e-12)) n.copy(at(k / 3))
      if (!(n.length() > 1e-12)) n.set(0, 1, 0)
      n.normalize()
      normals.push(n.x, n.y, n.z)
    }
  }
  return { positions, normals, index }
}

/** `w`'s sign times its size to the power `e`: the superellipse's rounding. */
const signedPow = (w: number, e: number) => Math.sign(w) * Math.abs(w) ** e

/** The least `round` a rounded box takes: any squarer and its faces' few steps would show at its corners. */
export const MIN_ROUND = 0.15

/**
 * A `Rounded` box: `size` [width, height, depth] round its middle, its edges
 * and corners rounded off by `round`, from nearly square (`MIN_ROUND`) to an
 * ellipsoid (1). A superellipsoid, with its true normals, so it shades and
 * outlines as one smooth soft shape: a doll's head, a cushion, a soap bar. Its
 * rounded edges carry the bevel weight (none on its flat faces), so they catch
 * the edge light; an ellipsoid has none. A size not above zero on any axis
 * draws nothing.
 */
export function roundedMesh(size: Vec3, round: number, across: number, down: number): MeshData {
  const [a, b, c] = size.map((s) => nonNegative(s) / 2)
  if (!(a > 1e-6 && b > 1e-6 && c > 1e-6)) return emptyMesh()
  const e = Math.min(1, Math.max(MIN_ROUND, finiteOr(round, 1)))
  const m = Math.max(12, Math.round(sideCount(across, 24) / 4) * 4)
  const n = Math.max(6, Math.round(sideCount(down, 12) / 2) * 2)
  // Exact zeros at the quarter turns, so the faces are flat and the corners fall on a step.
  const trig = (x: number) => [Math.abs(Math.cos(x)) < 1e-9 ? 0 : Math.cos(x), Math.abs(Math.sin(x)) < 1e-9 ? 0 : Math.sin(x)]
  const point = (u: number, v: number) => {
    const [cu, su] = trig(u)
    const [cv, sv] = trig(v)
    return new Vector3(a * signedPow(cu, e) * signedPow(sv, e), b * signedPow(su, e), c * signedPow(cu, e) * signedPow(cv, e))
  }
  const normal = (u: number, v: number) => {
    const [cu, su] = trig(u)
    const [cv, sv] = trig(v)
    const k = 2 - e
    const nv = new Vector3((signedPow(cu, k) * signedPow(sv, k)) / a, signedPow(su, k) / b, (signedPow(cu, k) * signedPow(cv, k)) / c)
    return nv.length() > 1e-12 ? nv.normalize() : new Vector3(0, Math.sign(su) || 1, 0)
  }
  const surface = closedSurface(m, n, point, normal)
  // Bevel where the normal turns between two faces, none on a face; none at all on an ellipsoid.
  const squareness = Math.min(1, Math.max(0, (1 - e) / 0.5))
  const bevel = new Float32Array(surface.positions.length / 3)
  for (let i = 0; i < bevel.length; i++) {
    const most = Math.max(...surface.normals.slice(i * 3, i * 3 + 3).map(Math.abs))
    bevel[i] = Math.min(1, Math.max(0, (0.97 - most) / 0.2)) * squareness
  }
  return { positions: new Float32Array(surface.positions), normals: new Float32Array(surface.normals), bevel, index: new Uint32Array(surface.index) }
}

/* ───────────── tufted balls: fur and fluff ───────────── */

/** The most tufts a ball carries, and the deepest they stand, as a share of its radius. */
export const TUFTED = { most: 120, deepest: 0.3 } as const

/** `n` directions spread evenly round a sphere, on a golden spiral. */
function spreadDirections(n: number): Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    return new Vector3(r * Math.cos(golden * i), y, r * Math.sin(golden * i))
  })
}

/** A usable tuft count. */
const tuftCount = (tufts: number) => Math.min(TUFTED.most, Math.max(0, Math.round(finiteOr(tufts, 0))))

/**
 * How finely a `Tufted` ball of `radius` with `tufts` tufts is drawn: enough
 * steps round it to show three or four to every tuft, never fewer than a soft
 * shape of its size takes (`softSegments`), at most 64; half as many down.
 */
export function tuftSegments(radius: number, tufts: number): { across: number; down: number } {
  const n = tuftCount(tufts)
  const spacing = n > 0 ? Math.sqrt((4 * Math.PI) / n) : Math.PI
  const want = Math.ceil((((2 * Math.PI) / spacing) * 3.5) / 4) * 4
  const across = Math.min(64, Math.max(softSegments(radius).across, want))
  return { across, down: across / 2 }
}

/**
 * A `Tufted` ball: an ellipsoid `radius` round, stretched by `squash`, with
 * `tufts` soft tufts of fur or fluff standing out of it, square to its
 * surface, up to `depth` of its thinnest radius (at most `TUFTED.deepest`),
 * spread evenly round it. Each tuft is a smooth swell
 * (its height the square of how near its middle a point is), so the surface
 * and its normals are continuous and the pushed outline runs round the lumpy
 * silhouette unbroken: a round furry animal, a fluffy chick. The tufts'
 * crests carry some bevel weight, so they catch the edge light. A ball with no
 * size on some axis draws nothing.
 */
export function tuftedMesh(radius: number, squash: Vec3, tufts: number, depth: number, across: number, down: number): MeshData {
  const axes = squash.map((s) => nonNegative(s) * nonNegative(radius)) as Vec3
  if (!axes.every((a) => a > 1e-6)) return emptyMesh()
  const d = Math.min(TUFTED.deepest, nonNegative(depth))
  const n = tuftCount(tufts)
  const dirs = spreadDirections(n)
  const spacing = n > 0 ? Math.sqrt((4 * Math.PI) / n) : Math.PI
  const near = Math.cos(Math.min(Math.PI / 2, spacing * 0.75))
  const bump = (dir: Vector3) => {
    let sum = 0
    for (const t of dirs) {
      const w = (dir.dot(t) - near) / (1 - near)
      if (w > 0) sum += w * w
    }
    return sum
  }
  // Never so few steps that a tuft falls between them: its normals would turn too far from one to the next.
  const need = tuftSegments(Math.max(...axes), n)
  const m = Math.max(need.across, Math.round(sideCount(across, 24) / 4) * 4)
  const k = Math.max(need.down, Math.round(sideCount(down, 12) / 2) * 2)
  // Tufts stand out square to the ball's surface, as deep as a share of its thinnest radius, so a flattened ball's rim stays soft.
  const thinnest = Math.min(...axes)
  const point = (u: number, v: number) => {
    const dir = new Vector3(Math.cos(u) * Math.sin(v), Math.sin(u), Math.cos(u) * Math.cos(v))
    const surface = new Vector3(dir.x * axes[0], dir.y * axes[1], dir.z * axes[2])
    const out = new Vector3(dir.x / axes[0], dir.y / axes[1], dir.z / axes[2]).normalize()
    return surface.addScaledVector(out, d * thinnest * bump(dir))
  }
  const surface = closedSurface(m, k, point)
  const bevel = new Float32Array(surface.positions.length / 3)
  for (let i = 0; i < bevel.length; i++) {
    const p = new Vector3(surface.positions[i * 3] / axes[0], surface.positions[i * 3 + 1] / axes[1], surface.positions[i * 3 + 2] / axes[2])
    bevel[i] = d > 0 && p.length() > 0 ? Math.min(1, bump(p.normalize())) * 0.6 : 0
  }
  return { positions: new Float32Array(surface.positions), normals: new Float32Array(surface.normals), bevel, index: new Uint32Array(surface.index) }
}

/* ───────────── brick courses ───────────── */

/** The most bricks one wall lays. */
export const BRICKS = { most: 4000 } as const

/** A rectangle on a wall's face, [x, y, width, height] round the wall's middle, that something stands over (a window, a door, a poster). */
export type Opening = [number, number, number, number]

/**
 * The bricks of a wall `width` x `height` round its middle, in the XY plane,
 * standing `depth` proud of its face (z = 0) toward +Z: courses of bricks
 * `brick` [length, height] with `joint` between them, in a running bond (each
 * course set half a brick along from the one below), cut at the wall's ends,
 * and the courses stretched a little to fill its height exactly. Each brick is
 * a flat face with a bevelled rim running back to the wall (10 triangles), the
 * rim carrying the bevel weight, so every brick's edge catches the light. The
 * bricks are shared out between `shades` meshes (the same wall every time), so
 * a wall can be laid in a few shades of its colour. No brick is laid wholly
 * inside one of the `openings`, which something stands over (a window, a door,
 * a poster), so the triangles go where they show. A wall with no size lays
 * none; at most `BRICKS.most`.
 */
export function brickCourses(width: number, height: number, brick: [number, number], joint: number, depth: number, shades: number, openings: Opening[] = []): MeshData[] {
  // Rectangles (round the wall's middle) that something covers: a brick wholly inside one is not laid.
  const covered = openings
    .map(([x, y, w, h]) => [x, y, w, h].map((n) => finiteOr(n, 0)))
    .filter(([, , w, h]) => w > 0 && h > 0)
    .map(([x, y, w, h]) => ({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 }))
  const hidden = (x0: number, x1: number, y0: number, y1: number) => covered.some((o) => x0 >= o.x0 && x1 <= o.x1 && y0 >= o.y0 && y1 <= o.y1)
  const [W, H, bw, bh, j, dz] = [width, height, brick[0], brick[1], joint, depth].map(nonNegative)
  const k = Math.min(8, Math.max(1, Math.round(finiteOr(shades, 1))))
  const out = Array.from({ length: k }, () => ({ positions: [] as number[], normals: [] as number[], bevel: [] as number[], index: [] as number[] }))
  const empty = () => out.map(() => emptyMesh())
  if (!(W > 1e-6 && H > 1e-6 && bw > 1e-6 && bh > 1e-6 && dz > 1e-6)) return empty()
  const along = bw + j
  const rows = Math.max(1, Math.round(H / (bh + j)))
  const pitch = H / rows
  const tall = pitch - j
  if (!(tall > 1e-6)) return empty()
  let laid = 0
  const lay = (x0: number, x1: number, y0: number, y1: number, shade: number) => {
    const mesh = out[shade]
    const b = Math.min(dz, (x1 - x0) / 4, (y1 - y0) / 4)
    const add = (x: number, y: number, z: number, n: Vec3, bevel: number) => {
      mesh.positions.push(x, y, z)
      mesh.normals.push(...n)
      mesh.bevel.push(bevel)
    }
    const quad = (corners: Array<[number, number, number]>, n: Vec3, bevel: number) => {
      const first = mesh.positions.length / 3
      for (const [x, y, z] of corners) add(x, y, z, n, bevel)
      const [a, bb, c] = corners.map((p) => new Vector3(...p))
      const flip = bb.clone().sub(a).cross(c.clone().sub(a)).dot(new Vector3(...n)) < 0
      const ids = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]
      mesh.index.push(...ids.map((i) => first + i))
    }
    const unit = (x: number, y: number, z: number): Vec3 => {
      const l = Math.hypot(x, y, z)
      return [x / l, y / l, z / l]
    }
    quad([[x0 + b, y0 + b, dz], [x1 - b, y0 + b, dz], [x1 - b, y1 - b, dz], [x0 + b, y1 - b, dz]], [0, 0, 1], 0)
    quad([[x0, y0, 0], [x1, y0, 0], [x1 - b, y0 + b, dz], [x0 + b, y0 + b, dz]], unit(0, -dz, b), 1)
    quad([[x1, y1, 0], [x0, y1, 0], [x0 + b, y1 - b, dz], [x1 - b, y1 - b, dz]], unit(0, dz, b), 1)
    quad([[x0, y1, 0], [x0, y0, 0], [x0 + b, y0 + b, dz], [x0 + b, y1 - b, dz]], unit(-dz, 0, b), 1)
    quad([[x1, y0, 0], [x1, y1, 0], [x1 - b, y1 - b, dz], [x1 - b, y0 + b, dz]], unit(dz, 0, b), 1)
    laid++
  }
  for (let r = 0; r < rows && laid < BRICKS.most; r++) {
    const y0 = -H / 2 + r * pitch + j / 2
    const start = -W / 2 - (r % 2) * (along / 2)
    for (let i = 0; start + i * along < W / 2 && laid < BRICKS.most; i++) {
      const x0 = Math.max(-W / 2, start + i * along + j / 2)
      const x1 = Math.min(W / 2, start + (i + 1) * along - j / 2)
      // A sliver at the wall's end is left as mortar.
      if (x1 - x0 < bw * 0.2 || hidden(x0, x1, y0, y0 + tall)) continue
      const hash = Math.abs(Math.sin(r * 12.9898 + i * 78.233) * 43758.5453) % 1
      lay(x0, x1, y0, y0 + tall, Math.floor(hash * k) % k)
    }
  }
  return out.map((m) => ({ positions: new Float32Array(m.positions), normals: new Float32Array(m.normals), bevel: new Float32Array(m.bevel), index: new Uint32Array(m.index) }))
}

/* ───────────── weather: rain and its cloud ───────────── */

/**
 * Rain: the most streaks one column draws, a streak's width across (model
 * units), and how far out under a rain cloud its column reaches, as a share of
 * the cloud's width (a little inside its puffs).
 */
export const RAIN = { most: 400, width: 0.016, underCloud: 0.42 } as const

/** How wide (`round`, its widest radius) and half how tall (`half`) a rain column is, made usable: what it can reach. */
export function rainColumn(radius: number, fall: number, across = 1): { round: number; half: number } {
  const r = nonNegative(radius)
  const a = Number.isFinite(across) ? Math.max(0, across) : 1
  return { round: r * Math.max(1, a), half: nonNegative(fall) / 2 }
}

/** How far a streak `length` long travels down a column `fall` tall, top to bottom. */
export function rainTravel(fall: number, length: number): number {
  return Math.max(0, nonNegative(fall) - nonNegative(length))
}

/**
 * Rain: `count` streaks `length` long falling through a column `radius` round
 * and `fall` tall, its top at the origin. Each streak is four corners in one
 * place on its axis (`corner` says where across, -1 to 1, and along, 0 at its
 * foot to 1, each one is), resting at the middle of the fall; the rain
 * material spreads it across to face the camera and carries it down the
 * column, each streak from its own moment (`phase`, 0 to 1), so a streak never
 * leaves the column: it moves at most `rainTravel / 2` either way from where
 * it rests. Placed at random from `seed`, the same every time; `across`
 * stretches the column's depth (z) as a share of its width, for an oval column.
 * No streaks, no room or no fall draws nothing; at most `RAIN.most`.
 */
export function rainMesh(count: number, radius: number, fall: number, length: number, seed: number, across = 1): MeshData & { corner: Float32Array; phase: Float32Array } {
  const deep = Number.isFinite(across) ? Math.max(0, across) : 1
  const n = Math.min(RAIN.most, Math.max(0, Math.round(finiteOr(count, 0))))
  const R = nonNegative(radius)
  const F = nonNegative(fall)
  const L = Math.min(nonNegative(length), F)
  if (n === 0 || R < 1e-6 || rainTravel(F, L) < 1e-6 || L < 1e-6) return { ...emptyMesh(), corner: new Float32Array(0), phase: new Float32Array(0) }
  const rand = mulberry32(Math.round(finiteOr(seed, 1)))
  const positions = new Float32Array(n * 12)
  const normals = new Float32Array(n * 12)
  const corner = new Float32Array(n * 8)
  const phase = new Float32Array(n * 4)
  const index = new Uint32Array(n * 6)
  const corners: Point2[] = [[-1, 0], [1, 0], [-1, 1], [1, 1]]
  for (let s = 0; s < n; s++) {
    const r = R * Math.sqrt(rand())
    const a = rand() * Math.PI * 2
    const when = rand()
    corners.forEach(([across, up], c) => {
      const v = s * 4 + c
      positions.set([r * Math.sin(a), -F / 2 + (up - 0.5) * L, r * deep * Math.cos(a)], v * 3)
      normals.set([0, 0, 1], v * 3)
      corner.set([across, up], v * 2)
      phase[v] = when
    })
    index.set([0, 1, 2, 2, 1, 3].map((i) => s * 4 + i), s * 6)
  }
  return { positions, normals, bevel: new Float32Array(n * 4), index, corner, phase }
}

/** The puffs of a rain cloud, in a unit box (x and z from -0.5 to 0.5, y from 0 to 1): where each sits, and its three radii. */
const PUFFS: Array<[Vec3, Vec3]> = [
  [[-0.3, 0.3, 0.02], [0.2, 0.3, 0.4]],
  [[-0.1, 0.32, -0.06], [0.22, 0.32, 0.42]],
  [[0.12, 0.3, 0.04], [0.22, 0.3, 0.42]],
  [[0.3, 0.28, -0.02], [0.2, 0.28, 0.4]],
  [[-0.12, 0.6, 0], [0.22, 0.38, 0.42]],
  [[0.13, 0.55, 0.05], [0.2, 0.35, 0.38]],
]

/**
 * A rain cloud's puffs as one mesh, filling a box `width` x `height` x
 * `depth` whose base is the origin: overlapping balls, flat along the base as
 * a cumulus is, each normal pointing out of its own puff. No size, no cloud.
 */
export function puffCloudMesh(width: number, height: number, depth: number): MeshData {
  const [w, h, d] = [width, height, depth].map(nonNegative)
  if (!(w > 1e-6 && h > 1e-6 && d > 1e-6)) return emptyMesh()
  // A step at every quarter turn round and at the equator, so no triangle crosses from one octant of a puff to the
  // next: a flattened puff's normals turn sharply at its rim, and a triangle across it would hold normals facing apart.
  const across = 16
  const down = 10
  const meshes = PUFFS.map(([[cx, cy, cz], [ra, rb, rc]]) => {
    const [a, b, c] = [ra * w, rb * h, rc * d]
    // The lowest puffs rest exactly on the base, so the cloud is flat along it.
    const point = (u: number, v: number) => new Vector3(cx * w + a * Math.cos(u) * Math.sin(v), cy * h + b * Math.sin(u), cz * d + c * Math.cos(u) * Math.cos(v))
    const normal = (u: number, v: number) => {
      const n = new Vector3((Math.cos(u) * Math.sin(v)) / a, Math.sin(u) / b, (Math.cos(u) * Math.cos(v)) / c)
      return n.length() > 1e-12 ? n.normalize() : new Vector3(0, 1, 0)
    }
    // Built round the puff's own middle, so its triangles face out of it, then moved to where it sits.
    const middle = new Vector3(cx * w, cy * h, cz * d)
    const surface = closedSurface(across, down, (u, v) => point(u, v).sub(middle), normal)
    const positions = surface.positions.map((x, i) => x + middle.getComponent(i % 3))
    return { positions: new Float32Array(positions), normals: new Float32Array(surface.normals), bevel: new Float32Array(positions.length / 3), index: new Uint32Array(surface.index) }
  })
  return joinMeshes(meshes)
}

/**
 * How to lay a part that stands along +Y from its origin (a `Tube`, a `Peak`)
 * from `from` to `to`: put it `at` `from`, turned by `rot` (Euler angles in
 * three's default order), `length` long. A branch, a leg, a pipe, a tail's
 * segment. Two points in one place give no turn and no length.
 */
export function pointing(from: Vec3, to: Vec3): { at: Vec3; rot: Vec3; length: number } {
  const start = new Vector3(...from.map((n) => finiteOr(n, 0)))
  const d = new Vector3(...to.map((n) => finiteOr(n, 0))).sub(start)
  const length = d.length()
  if (!(length > 1e-9)) return { at: start.toArray() as Vec3, rot: [0, 0, 0], length: 0 }
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.divideScalar(length)))
  return { at: start.toArray() as Vec3, rot: [turn.x, turn.y, turn.z], length }
}

/* ───────────── lattice ───────────── */

/** A `Truss`'s bars: their thickness by default, and the most bays a girder is divided into. */
export const TRUSS = { bar: 0.014, most: 40 } as const

/** A square bar `thickness` across from `from` to `to`, its edges chamfered: a small `Block` laid between two points. */
function barBetween(from: Vector3, to: Vector3, thickness: number): MeshData {
  const d = to.clone().sub(from)
  const length = d.length()
  if (!(length > 1e-9)) return emptyMesh()
  const box = chamferedBox([thickness, length, thickness], Math.max(thickness * 0.25, MIN_BEVEL))
  const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.divideScalar(length))
  const middle = from.clone().add(to).multiplyScalar(0.5)
  const positions = new Float32Array(box.positions.length)
  const normals = new Float32Array(box.normals.length)
  const v = new Vector3()
  for (let i = 0; i < box.positions.length / 3; i++) {
    v.fromArray(box.positions, i * 3).applyQuaternion(turn).add(middle).toArray(positions, i * 3)
    v.fromArray(box.normals, i * 3).applyQuaternion(turn).normalize().toArray(normals, i * 3)
  }
  return { positions, normals, bevel: new Float32Array(box.bevel), index: box.index ? new Uint32Array(box.index) : undefined }
}

/**
 * A `Truss`: a lattice girder standing along +Y from its base centre,
 * `height` tall. `sides` chords (3 to 8) run up the corners of a regular
 * cross-section `width` across each face, with a face toward +Z (a three-sided
 * one has its third chord at the back). The height is divided into `bays`
 * (at most `TRUSS.most`); every face is braced by one diagonal a bay,
 * alternating, so the diagonals zigzag up it; a strut runs round each end.
 * Every member is a square bar `bar` across with chamfered edges, so the
 * lattice catches the edge light as a `Block` does. One mesh, so a moving jib
 * is one live part. A girder with no height, no width or no bar draws nothing.
 */
export function trussMesh(height: number, width: number, sides: number, bays: number, bar: number): MeshData {
  const members = trussMembers(height, width, sides, bays, bar)
  if (!members) return emptyMesh()
  const t = nonNegative(bar)
  const along = ([from, to]: [Vec3, Vec3]) => barBetween(new Vector3(...from), new Vector3(...to), t)
  const bars: MeshData[] = []
  members.chords.forEach((chord, c) => {
    bars.push(along(chord), ...members.struts[c].map(along), ...members.diagonals[c].map(along))
  })
  return joinMeshes(bars)
}

/** A girder's members, each as the centreline from one end to the other. */
export interface TrussMembers {
  /** One a corner, foot to top. */
  chords: Array<[Vec3, Vec3]>
  /** For each face, the strut across its foot and the one across its top. */
  struts: Array<Array<[Vec3, Vec3]>>
  /** For each face, its diagonals bay by bay from the foot up, each starting where the last ended. */
  diagonals: Array<Array<[Vec3, Vec3]>>
}

/**
 * The centrelines of a `Truss`'s members (`trussMesh` lays a bar along each):
 * the chords on the corners of the cross-section (`sides` from 3 to 8, a face
 * square to +Z), a strut across each face at each end, and on each face one
 * diagonal a bay, alternating across it so they zigzag up. The struts and the
 * diagonals' ends sit half a bar in from the girder's ends, so it is exactly
 * `height` tall. Null for a girder with no height, no width or no bar.
 */
export function trussMembers(height: number, width: number, sides: number, bays: number, bar: number): TrussMembers | null {
  const [h, w, t] = [height, width, bar].map(nonNegative)
  if (h < 1e-6 || w < 1e-6 || t < 1e-6) return null
  const n = Math.min(MAX_FACETED_SIDES, sideCount(sides, 4))
  const count = Math.min(TRUSS.most, Math.max(1, Math.round(finiteOr(bays, 1))))
  const reach = w / (2 * Math.sin(Math.PI / n))
  const corner = (k: number, y: number): Vec3 => {
    const a = Math.PI / n + (2 * Math.PI * k) / n
    return [reach * Math.sin(a), y, reach * Math.cos(a)]
  }
  const low = Math.min(t / 2, h / 2)
  const level = (k: number) => low + ((h - 2 * low) * k) / count
  const faces = Array.from({ length: n }, (_, c) => c)
  return {
    chords: faces.map((c) => [corner(c, 0), corner(c, h)]),
    struts: faces.map((c) => [low, h - low].map((y) => [corner(c, y), corner(c + 1, y)] as [Vec3, Vec3])),
    diagonals: faces.map((c) =>
      Array.from({ length: count }, (_, k) => {
        const [a, b] = k % 2 === 0 ? [c, c + 1] : [c + 1, c]
        return [corner(a, level(k)), corner(b, level(k + 1))] as [Vec3, Vec3]
      }),
    ),
  }
}

/** A street lamp's make, as shares of its lantern's width: the lantern's height, the cap's, the foot's, the post's radius at its foot and top. */
export const STREET_LAMP = { lantern: 0.04, tall: 1.35, cap: 0.3, capWidth: 1.4, foot: 1.0, footWidth: 1.5, post: [0.3, 0.22] as const }

/** Where a `StreetLamp`'s pieces go, from its foot (y = 0) up. */
export interface StreetLampParts {
  /** A square block it stands on, or null for none. */
  foot: { size: Vec3; at: Vec3 } | null
  /** The post, a `Tube` standing on `at`. */
  post: { bottom: number; top: number; height: number; at: Vec3 }
  /** The lantern, centred on `at`. */
  lantern: { size: Vec3; at: Vec3 }
  /** The cap over it, centred on `at`. */
  cap: { size: Vec3; at: Vec3 }
}

/**
 * A street lamp `height` tall from its foot to the top of its cap: a slim
 * tapering post (on a square foot, with `foot`), a lantern `lantern` wide and
 * a flat cap sheltering it, every piece in proportion to the lantern and
 * stacked on the one below. The post takes what the rest leaves. A lantern
 * that is not a size takes the usual one (`STREET_LAMP.lantern`); a lamp with
 * no room for a post under its lantern and cap is null (it draws nothing).
 */
export function streetLampParts(height: number, lantern: number, foot: boolean): StreetLampParts | null {
  const w = Number.isFinite(lantern) && lantern > 0 ? lantern : STREET_LAMP.lantern
  if (!Number.isFinite(height)) return null
  const footH = foot ? w * STREET_LAMP.foot : 0
  const lanternH = w * STREET_LAMP.tall
  const capH = w * STREET_LAMP.cap
  const post = height - footH - lanternH - capH
  // A post shorter than its lantern is wide is no lamp.
  if (!(post >= w)) return null
  const [stackFoot, stackLantern, stackCap] = [footH, footH + post, footH + post + lanternH]
  const fw = w * STREET_LAMP.footWidth
  const cw = w * STREET_LAMP.capWidth
  return {
    foot: foot ? { size: [fw, footH, fw], at: [0, footH / 2, 0] } : null,
    post: { bottom: w * STREET_LAMP.post[0], top: w * STREET_LAMP.post[1], height: post, at: [0, stackFoot, 0] },
    lantern: { size: [w, lanternH, w], at: [0, stackLantern + lanternH / 2, 0] },
    cap: { size: [cw, capH, cw], at: [0, stackCap + capH / 2, 0] },
  }
}

/* ───────────── colour and motion ───────────── */

/** `a` moved `k` of the way to `b` (both palette or district colours), as a hex string. */
export function blend(a: string, b: string, k: number): string {
  return `#${new Color(a).lerp(new Color(b), k).getHexString()}`
}

/** A gentle back-and-forth: `amount` either way, `speed` radians a second, from the shared clock `t`. */
export function wave(t: number, amount: number, speed: number, phase = 0): number {
  return amount * Math.sin(t * speed + phase)
}

/**
 * The shared clock `t` (seconds, growing for as long as the page is open)
 * brought within one `period` of a motion that repeats, for a shader: in a
 * shader's single-precision float, a clock a day old has lost so much of its
 * fraction that a fall or a ripple runs from it in steps. Worked out here, in
 * double precision, it stays smooth however long the visit. A period that is
 * not a positive number (a motion that never moves) gives 0.
 */
export function wrapTime(t: number, period: number): number {
  if (!(period > 0) || !Number.isFinite(period) || !Number.isFinite(t)) return 0
  return ((t % period) + period) % period
}

/** A steady turn at `speed` radians a second, kept within one turn. */
export function spinAngle(t: number, speed: number): number {
  const turn = Math.PI * 2
  return (((t * speed) % turn) + turn) % turn
}

/* ───────────── a snow-capped peak, a die, a flag's emblem ───────────── */

/** A mesh from plain arrays. */
function meshOf(positions: number[], normals: number[], bevel?: number[], index?: number[]): MeshData {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    bevel: bevel ? new Float32Array(bevel) : new Float32Array(positions.length / 3),
    index: index ? new Uint32Array(index) : undefined,
  }
}

/**
 * A snow-capped peak: how many rings of corners it is built of from its foot
 * to its tip (`rows`), how far in a corner may stand from the true cone
 * (`jitter`, a share of the ring's radius, so it is craggy and never wider
 * than its radius), how far the snow line's corners rise and dip by turns
 * (`jag`, a share of the gap to the next ring), and the curve of its flanks
 * (`curve`: the radius at height share t is (1 - t) to this power, a little
 * steeper toward the top).
 */
export const SNOW_PEAK = { rows: 8, jitter: 0.12, jag: 0.35, curve: 1.15 } as const

/**
 * A `SnowPeak`: a faceted mountain `radius` across its foot and `height` to
 * its tip, standing on y = 0 round the upright axis, built of `sides`-cornered
 * rings each turned half a step from the last, so its faces are triangles
 * (a mountain's facets, not a cone's strips); its corners stand in from the
 * true cone by a little, the same for one `seed`. Below the snow line (`snow`,
 * a share of its height; 1 for none) is `rock`, above it the `cap`: the line
 * runs along a ring whose corners rise and dip by turns, so the snow's edge is
 * jagged. Each face is lit from its own flat normal. `shell` is the whole of
 * it again with its corners shared and smooth normals (the foot's turned
 * level), for its line, which then never cracks at a facet. Nothing for a
 * size that is not usable.
 */
export function snowPeakMeshes(radius: number, height: number, sides: number, snow: number, seed: number): { rock: MeshData; cap: MeshData; shell: MeshData } {
  const r = nonNegative(radius)
  const h = nonNegative(height)
  if (r < 1e-6 || h < 1e-6) return { rock: emptyMesh(), cap: emptyMesh(), shell: emptyMesh() }
  // At least five sides: fewer is a spike, not a mountain, and its shell's normals turn too far between rings.
  const n = Math.max(5, sideCount(sides, 9))
  const rows = SNOW_PEAK.rows
  const s = Math.min(1, Math.max(1 / rows, finiteOr(snow, 0.7)))
  const bare = s >= 1 - 1e-6
  // The rings' heights as shares, from the foot up (the tip apart); the snow line is ring `line`.
  const below = Math.max(1, Math.round(s * rows))
  const above = Math.max(1, rows - below)
  const shares = bare
    ? Array.from({ length: rows }, (_, j) => j / rows)
    : [...Array.from({ length: below + 1 }, (_, j) => (s * j) / below), ...Array.from({ length: above - 1 }, (_, k) => s + ((1 - s) * (k + 1)) / above)]
  const line = bare ? Infinity : below
  const random = mulberry32(Math.round(finiteOr(seed, 0)) * 7919 + 17)
  const corners: Vector3[] = []
  shares.forEach((t, j) => {
    const ring = r * Math.pow(1 - t, SNOW_PEAK.curve)
    // The snow line's rise and dip: a share of the gap to the next ring, and never steeper than the corners are apart round it.
    const gap = Math.min(Math.min(j > 0 ? t - shares[j - 1] : 1, j + 1 < shares.length ? shares[j + 1] - t : 1 - t) * h, (Math.PI * 2 * ring) / n)
    for (let k = 0; k < n; k++) {
      const a = ((k + (j % 2) * 0.5) / n) * Math.PI * 2
      const out = ring * (1 - SNOW_PEAK.jitter * random())
      const y = t * h + (j === line ? (k % 2 ? -1 : 1) * SNOW_PEAK.jag * gap : 0)
      corners.push(new Vector3(out * Math.sin(a), y, out * Math.cos(a)))
    }
  })
  const tip = corners.length
  corners.push(new Vector3(0, h, 0))
  const foot = corners.length
  corners.push(new Vector3(0, 0, 0))
  const id = (j: number, k: number) => j * n + (((k % n) + n) % n)

  // Every face, wound outward (down for the foot), and whether it is snow.
  const faces: Array<{ ids: [number, number, number]; snow: boolean }> = []
  const face = (a: number, b: number, c: number, snowy: boolean, down = false) => {
    const [pa, pb, pc] = [corners[a], corners[b], corners[c]]
    const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa))
    const middle = pa.clone().add(pb).add(pc)
    const out = down ? new Vector3(0, -1, 0) : new Vector3(middle.x, 0, middle.z)
    faces.push({ ids: normal.dot(out) >= 0 ? [a, b, c] : [a, c, b], snow: snowy })
  }
  for (let j = 0; j + 1 < shares.length; j++) {
    const snowy = j >= line
    for (let k = 0; k < n; k++) {
      if (j % 2 === 0) {
        face(id(j, k), id(j, k + 1), id(j + 1, k), snowy)
        face(id(j + 1, k), id(j, k + 1), id(j + 1, k + 1), snowy)
      } else {
        face(id(j, k), id(j + 1, k + 1), id(j + 1, k), snowy)
        face(id(j, k), id(j, k + 1), id(j + 1, k + 1), snowy)
      }
    }
  }
  const last = shares.length - 1
  for (let k = 0; k < n; k++) face(id(last, k), id(last, k + 1), tip, !bare)
  for (let k = 0; k < n; k++) face(foot, id(0, k), id(0, k + 1), false, true)

  // The faceted body: each face its own three corners and flat normal.
  const parts = { rock: { p: [] as number[], n: [] as number[] }, cap: { p: [] as number[], n: [] as number[] } }
  // The shell's smooth normals: each corner's faces' normals, weighted by their area.
  const smooth = corners.map(() => new Vector3())
  for (const { ids, snow: snowy } of faces) {
    const [a, b, c] = ids.map((i) => corners[i])
    const cross = b.clone().sub(a).cross(c.clone().sub(a))
    for (const i of ids) smooth[i].add(cross)
    const normal = cross.lengthSq() > 0 ? cross.clone().normalize() : new Vector3(0, 1, 0)
    const into = snowy ? parts.cap : parts.rock
    for (const p of [a, b, c]) {
      into.p.push(p.x, p.y, p.z)
      into.n.push(normal.x, normal.y, normal.z)
    }
  }
  // The foot's corners push their line out level, so it stays on the ground; the foot's middle pushes down.
  for (let k = 0; k < n; k++) smooth[id(0, k)].y = 0
  smooth[foot].set(0, -1, 0)
  const shellNormals = smooth.flatMap((v) => (v.lengthSq() > 0 ? v.normalize() : v.set(0, 1, 0)).toArray())
  return {
    rock: meshOf(parts.rock.p, parts.rock.n),
    cap: meshOf(parts.cap.p, parts.cap.n),
    shell: meshOf(
      corners.flatMap((v) => v.toArray()),
      shellNormals,
      undefined,
      faces.flatMap((f) => f.ids),
    ),
  }
}

/** A twenty-sided die: its inradius (to the middle of a face) as a share of its radius (to a corner). */
export const DIE = { inradius: 0.7946544722917661 } as const

/**
 * A `Die`: an icosahedron `radius` from its middle to its corners, resting on
 * one face on y = 0 with its origin under its middle (so a turn about the
 * upright keeps it standing on that face), its opposite face level on top.
 * Twenty flat faces, every edge and corner bevelled by `bevel` (held between a
 * hair and a seventh of its radius): each face is drawn in from its edges, a
 * strip joins each two faces along their edge and a small five-sided facet
 * caps each corner, the bevels' corners carrying their faces' normals so the
 * light turns smoothly across them (marked as bevel, for the edge light).
 * Nothing for a size that is not usable.
 */
export function dieMesh(radius: number, bevel: number): MeshData {
  const R = nonNegative(radius)
  if (R < 1e-6) return emptyMesh()
  const b = Math.min(R / 7, Math.max(R * 0.005, finiteOr(bevel, 0)))
  const phi = (1 + Math.sqrt(5)) / 2
  const raw: Vector3[] = []
  for (const s of [-1, 1]) for (const t of [-1, 1]) raw.push(new Vector3(0, s, t * phi), new Vector3(s, t * phi, 0), new Vector3(t * phi, 0, s))
  const corners = raw.map((v) => v.normalize().multiplyScalar(R))
  // The faces: every three corners an edge apart from each other, wound outward.
  const edge = corners[0].distanceTo(corners.reduce((best, v) => (v !== corners[0] && v.distanceTo(corners[0]) < best.distanceTo(corners[0]) ? v : best), corners[1]))
  const near = (a: number, c: number) => Math.abs(corners[a].distanceTo(corners[c]) - edge) < edge * 1e-3
  const faces: number[][] = []
  for (let a = 0; a < 12; a++)
    for (let c = a + 1; c < 12; c++)
      for (let d = c + 1; d < 12; d++) {
        if (!near(a, c) || !near(c, d) || !near(a, d)) continue
        const n = corners[c].clone().sub(corners[a]).cross(corners[d].clone().sub(corners[a]))
        faces.push(n.dot(corners[a]) > 0 ? [a, c, d] : [a, d, c])
      }
  // Turned to rest on its first face, then lifted to stand on y = 0.
  const normalOf = (f: number[]) => corners[f[1]].clone().sub(corners[f[0]]).cross(corners[f[2]].clone().sub(corners[f[0]])).normalize()
  const turn = new Quaternion().setFromUnitVectors(normalOf(faces[0]), new Vector3(0, -1, 0))
  const lift = new Vector3(0, DIE.inradius * R, 0)
  for (const v of corners) v.applyQuaternion(turn).add(lift)
  const middle = lift
  const positions: number[] = []
  const normals: number[] = []
  const bevels: number[] = []
  const index: number[] = []
  const vertex = (p: Vector3, n: Vector3, bev: number) => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
    bevels.push(bev)
    return positions.length / 3 - 1
  }
  const tri = (ids: number[]) => {
    const p = ids.map((i) => new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]))
    const n = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]))
    const mid = p[0].clone().add(p[1]).add(p[2]).divideScalar(3).sub(middle)
    index.push(...(n.dot(mid) >= 0 ? ids : [ids[0], ids[2], ids[1]]))
  }
  // Each face drawn in from its edges by the bevel: its corners, and its normal.
  const inset = faces.map((f) => {
    const g = f.reduce((s, i) => s.add(corners[i]), new Vector3()).divideScalar(3)
    const normal = normalOf(f)
    const k = Math.min(0.45, (2 * b) / corners[f[0]].distanceTo(g))
    const at = new Map(f.map((i) => [i, corners[i].clone().lerp(g, k)]))
    tri(f.map((i) => vertex(at.get(i)!, normal, 0)))
    return { f, normal, at }
  })
  // A strip along each edge, between the two faces' drawn-in edges.
  for (let x = 0; x < inset.length; x++)
    for (let y = x + 1; y < inset.length; y++) {
      const shared = inset[x].f.filter((i) => inset[y].f.includes(i))
      if (shared.length !== 2) continue
      const [u, v] = shared
      const ids = [vertex(inset[x].at.get(u)!, inset[x].normal, 1), vertex(inset[x].at.get(v)!, inset[x].normal, 1), vertex(inset[y].at.get(v)!, inset[y].normal, 1), vertex(inset[y].at.get(u)!, inset[y].normal, 1)]
      tri([ids[0], ids[1], ids[2]])
      tri([ids[0], ids[2], ids[3]])
    }
  // A five-sided facet over each corner, its five faces' drawn-in corners in order round it.
  for (let c = 0; c < 12; c++) {
    const axis = corners[c].clone().sub(middle).normalize()
    const side = new Vector3(axis.y, -axis.x, 0).lengthSq() > 1e-6 ? new Vector3(axis.y, -axis.x, 0).normalize() : new Vector3(1, 0, 0)
    const up = axis.clone().cross(side)
    const round = inset
      .filter(({ f }) => f.includes(c))
      .map(({ at, normal }) => {
        const p = at.get(c)!
        const d = p.clone().sub(corners[c])
        return { p, normal, angle: Math.atan2(d.dot(up), d.dot(side)) }
      })
      .sort((p, q) => p.angle - q.angle)
    const ids = round.map(({ p, normal }) => vertex(p, normal, 1))
    for (let k = 1; k + 1 < ids.length; k++) tri([ids[0], ids[k], ids[k + 1]])
  }
  return meshOf(positions, normals, bevels, index)
}

/** How far an emblem stands proud of each face of a still cloth. */
export const EMBLEM_LIFT = 0.002

/**
 * How far an emblem stands proud of each face of a cloth rippling `amplitude`
 * deep (`clothWave`): `EMBLEM_LIFT`, and as much again as the cloth, cut into
 * `CLOTH.columns` straight columns, can fall short of the true ripple the
 * finer-cut emblem follows (a chord's sag over one column: amplitude × the
 * ripple's turn across a column, squared, over 8; a quarter more, for the
 * ripple growing toward the fly end). So the emblem never sinks
 * into its cloth at the crest of a wave, however wide the flag or deep its
 * wave.
 */
export function emblemLift(amplitude: number): number {
  const turn = (Math.PI * 2 * CLOTH.waves) / CLOTH.columns
  return EMBLEM_LIFT + (1.25 * nonNegative(amplitude) * turn * turn) / 8
}

/**
 * An emblem painted on a `Flag`'s cloth, `width` by `height`: `pieces`, each
 * an outline in the cloth's plane round the cloth's middle (x along the
 * cloth, y up it) and star-shaped about its own middle (the mean of its
 * points; a convex piece always is), laid on both faces of the cloth a hair
 * proud of each (`lift`: `emblemLift` of its wave), held to the cloth. Each piece is fanned from
 * its middle in rings and its outline cut fine, so no triangle runs further
 * along the cloth than one of the cloth's columns: the cloth's vertex shader
 * then ripples it with the cloth, point for point. A piece with no area, a
 * piece with fewer than three usable points, or a cloth with no size draws
 * nothing.
 */
export function emblemMesh(pieces: Point2[][], width: number, height: number, lift = EMBLEM_LIFT): MeshData {
  const W = nonNegative(width)
  const H = nonNegative(height)
  if (W < 1e-6 || H < 1e-6) return emptyMesh()
  const step = W / CLOTH.columns / 2
  const z = CLOTH.thickness / 2 + Math.max(EMBLEM_LIFT, finiteOr(lift, EMBLEM_LIFT))
  const positions: number[] = []
  const normals: number[] = []
  const place = (x: number, y: number) => [Math.min(W, Math.max(0, W / 2 + x)), Math.min(0, Math.max(-H, -H / 2 + y))]
  for (const piece of pieces) {
    let points = piece.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    if (points.length < 3) continue
    let area = 0
    points.forEach(([x, y], k) => {
      const [nx, ny] = points[(k + 1) % points.length]
      area += x * ny - nx * y
    })
    if (Math.abs(area) < 1e-12) continue
    if (area < 0) points = [...points].reverse()
    // The outline cut fine, then rings of it drawn in toward the piece's middle.
    const fine: Point2[] = points.flatMap(([x, y], k) => {
      const [nx, ny] = points[(k + 1) % points.length]
      const cuts = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / step))
      return Array.from({ length: cuts }, (_, c) => [x + ((nx - x) * c) / cuts, y + ((ny - y) * c) / cuts] as Point2)
    })
    const mx = points.reduce((s, [x]) => s + x, 0) / points.length
    const my = points.reduce((s, [, y]) => s + y, 0) / points.length
    const reach = Math.max(...fine.map(([x, y]) => Math.hypot(x - mx, y - my)))
    const rings = Math.max(1, Math.ceil(reach / step))
    const at = (k: number, ring: number) => {
      const [x, y] = fine[k % fine.length]
      return place(mx + ((x - mx) * ring) / rings, my + ((y - my) * ring) / rings)
    }
    const tri = (a: number[], b: number[], c: number[]) => {
      for (const side of [1, -1]) {
        const corners = side > 0 ? [a, b, c] : [a, c, b]
        for (const [x, y] of corners) {
          positions.push(x, y, side * z)
          normals.push(0, 0, side)
        }
      }
    }
    for (let k = 0; k < fine.length; k++) {
      tri(at(k, 0), at(k, 1), at(k + 1, 1))
      for (let ring = 2; ring <= rings; ring++) {
        tri(at(k, ring - 1), at(k, ring), at(k + 1, ring))
        tri(at(k, ring - 1), at(k + 1, ring), at(k + 1, ring - 1))
      }
    }
  }
  return meshOf(positions, normals)
}
