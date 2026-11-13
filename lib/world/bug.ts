import { Vector3 } from 'three'
import { BUG } from '@/content/eggs'
import type { District, LatLon, Place } from '@/content/types'
import { FIRM_GROUND } from './characters'
import { D2R, dirOf } from './geo'
import { footprintRadius } from './kit'
import { mulberry32, WORLD_SEED } from './rng'
import { MODEL_DEG, reachOf, sceneryLayout } from './scatter'
import { landValue } from './terrain'

/*
 * The bug easter egg's walk, as data: where on the planet a bug may walk (firm
 * land, clear of every landmark's footprint and every tree and building),
 * where a new one appears, the path it wanders along, how it paces itself and
 * how large it is drawn. Pure: three's maths only, and the same for one seed.
 */

/** The first bug's seed; each bug after it takes the next (`bugSeed`). */
export const BUG_SEED = WORLD_SEED + 23

/**
 * What the bug may draw, outlines included: a small ladybug from the kit's
 * parts, its shell and head the round parts that cost most. It is not a
 * landmark, so apart from their budgets (`TRIANGLE_BUDGET`, `PLANET_TRIANGLE_BUDGET`
 * in kit.ts), though the planet's totals are checked with it in.
 */
export const BUG_TRIANGLE_BUDGET = 3_200
/** Draw calls for the bug once batched: one per material its still body uses, plus its two sets of legs, which move. */
export const BUG_DRAW_BUDGET = 10

/** The seed of the `n`th bug (from 0): each appears somewhere new, and the same somewhere for the same `n`. */
export function bugSeed(n: number): number {
  return BUG_SEED + Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)) * 7919
}

/** Something the bug walks round: its direction from the centre, and the cosine of how far (as an angle) it keeps from it. */
interface Keep {
  dir: Vector3
  cos: number
}

/** Where a bug may walk on one planet: its islands, and everything it keeps clear of. */
export interface BugGround {
  districts: District[]
  keep: Keep[]
}

/**
 * The ground a bug walks on, for these districts and places: every landmark's
 * allowed footprint and every tree and building (`sceneryLayout`), each with
 * `BUG.clearance` round it, so its body never pokes into one and its hit shape
 * never sits on a landmark's.
 */
export function bugGround(districts: District[], places: Place[]): BugGround {
  const { trees, buildings } = sceneryLayout(districts, places)
  const keep = (dir: Vector3, reach: number): Keep => ({ dir, cos: Math.cos((reach + BUG.clearance) * MODEL_DEG * D2R) })
  return {
    districts,
    keep: [
      ...places.map((p) => keep(dirOf(p.at), footprintRadius(p.id, places))),
      ...trees.map((t) => keep(t.dir, reachOf(t))),
      ...buildings.map((b) => keep(b.dir, reachOf(b))),
    ],
  }
}

/** Whether a bug may stand at `dir` (a unit vector): firm land (not the sea nor its sand), clear of everything it keeps from. */
export function walkable(dir: Vector3, ground: BugGround): boolean {
  if (landValue(dir, ground.districts).v < FIRM_GROUND) return false
  for (const k of ground.keep) if (dir.x * k.dir.x + dir.y * k.dir.y + dir.z * k.dir.z > k.cos) return false
  return true
}

/** A random direction, even over the sphere. */
function randomDir(rand: () => number): Vector3 {
  const y = rand() * 2 - 1
  const a = rand() * Math.PI * 2
  const r = Math.sqrt(1 - y * y)
  return new Vector3(r * Math.cos(a), y, r * Math.sin(a))
}

/** How many places a new bug tries before it settles for the best it found. */
const SPAWN_TRIES = 4000

/**
 * Where a new bug appears for `seed`: a walkable spot, at least `BUG.hop`
 * degrees from `avoid` (where the last one was caught), if given. With `near`
 * (a test's), the walkable spot nearest it instead. Null if there is nowhere
 * (no land at all).
 */
export function spawnPoint(seed: number, ground: BugGround, { avoid, near }: { avoid?: Vector3; near?: LatLon } = {}): Vector3 | null {
  if (near) return nearestWalkable(dirOf(near), ground)
  const rand = mulberry32(seed)
  const hop = Math.cos(BUG.hop * D2R)
  for (let i = 0; i < SPAWN_TRIES; i++) {
    const dir = randomDir(rand)
    if (avoid && dir.dot(avoid) > hop) continue
    if (walkable(dir, ground)) return dir
  }
  return null
}

/** The rings `nearestWalkable` searches out along, and how finely, in degrees. */
const NEAREST = { ring: 0.4, around: 0.4, furthest: 90 }

/** The walkable spot nearest `target`, searched ring by ring outward from it (to `NEAREST`'s fineness); null if none within a quarter turn. */
function nearestWalkable(target: Vector3, ground: BugGround): Vector3 | null {
  if (walkable(target, ground)) return target.clone()
  const side = flatten(new Vector3(0, 1, 0), target)
  const axis = new Vector3()
  const out = new Vector3()
  for (let r = NEAREST.ring; r <= NEAREST.furthest; r += NEAREST.ring) {
    const n = Math.max(6, Math.ceil((360 * Math.sin(r * D2R)) / NEAREST.around))
    for (let k = 0; k < n; k++) {
      turnAbout(side, target, (k / n) * Math.PI * 2, axis)
      axis.cross(target).normalize()
      turnAbout(target, axis, r * D2R, out).normalize()
      if (walkable(out, ground)) return out.clone()
    }
  }
  return null
}

/** `v` turned `angle` radians about the unit axis `axis` (Rodrigues), into `out`. */
function turnAbout(v: Vector3, axis: Vector3, angle: number, out = new Vector3()): Vector3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const d = axis.dot(v)
  const x = axis.y * v.z - axis.z * v.y
  const y = axis.z * v.x - axis.x * v.z
  const z = axis.x * v.y - axis.y * v.x
  return out.set(v.x * c + x * s + axis.x * d * (1 - c), v.y * c + y * s + axis.y * d * (1 - c), v.z * c + z * s + axis.z * d * (1 - c))
}

/** `heading` made square to the up `at` and of unit length; any square direction if it was along it. */
function flatten(heading: Vector3, at: Vector3): Vector3 {
  const h = heading.clone().addScaledVector(at, -heading.dot(at))
  if (h.lengthSq() < 1e-12) {
    h.set(at.y, -at.x, 0)
    if (h.lengthSq() < 1e-12) h.set(0, at.z, -at.y)
  }
  return h.normalize()
}

/** One leg of a bug's walk: the points it passes through (unit vectors, `BUG.step` apart or standing still), and the way it faces at the end. */
export interface Leg {
  points: Vector3[]
  heading: Vector3
}

/**
 * A wandering walk of `steps` steps from `start` (walkable), first facing
 * `heading` (any direction; made square to the ground). Each step it turns a
 * little at random (`BUG.wiggle`) and walks `BUG.step` degrees on; where that
 * step would leave walkable ground it turns further, a `BUG.turnStep` at a
 * time and either way, until the way ahead is clear, or, hemmed in, turns
 * round and stands for the step. So every point it passes is walkable, and
 * the same seed always walks the same way.
 */
export function wander(seed: number, ground: BugGround, start: Vector3, heading: Vector3, steps: number = BUG.legSteps): Leg {
  const rand = mulberry32(seed)
  const step = BUG.step * D2R
  let at = start.clone().normalize()
  let facing = flatten(heading, at)
  const points = [at.clone()]
  const axis = new Vector3()
  const next = new Vector3()
  const tried = new Vector3()
  const tries = Math.ceil(Math.PI / BUG.turnStep)
  for (let i = 0; i < steps; i++) {
    facing = flatten(turnAbout(facing, at, (rand() - 0.5) * 2 * BUG.wiggle), at)
    const side = rand() < 0.5 ? 1 : -1
    let moved = false
    for (let k = 0; k <= 2 * tries && !moved; k++) {
      // 0, then +1, -1, +2, -2 … turn steps, the first way chosen at random.
      const turn = k === 0 ? 0 : side * (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * BUG.turnStep
      turnAbout(facing, at, turn, tried)
      // A step along the great circle through `at` toward `tried`.
      axis.crossVectors(at, tried).normalize()
      turnAbout(at, axis, step, next).normalize()
      if (walkable(next, ground)) {
        facing = flatten(tried, next)
        at = next.clone()
        moved = true
      }
    }
    if (!moved) facing.negate()
    points.push(at.clone())
  }
  return { points, heading: facing }
}

/**
 * How fast a bug is walking at `t` seconds into its pace (0 stopped, 1 its full
 * speed): it walks `BUG.walk` seconds and stops `BUG.pause`, round and round,
 * easing into and out of each stop over a fifth of a second.
 */
export function bugPace(t: number): number {
  const cycle = BUG.walk + BUG.pause
  const ease = 0.2
  const r = ((Number.isFinite(t) ? t : 0) % cycle + cycle) % cycle
  if (r >= BUG.walk) return 0
  return Math.min(1, r / ease, (BUG.walk - r) / ease)
}

/** Hermite step from 0 at `a` to 1 at `b`. */
const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/**
 * How large the bug is drawn with the camera `distance` from the planet's
 * centre: its own size close to (at a place), growing to `BUG.farScale` times
 * it far out over the planet, where it would otherwise be a speck.
 */
export function bugScale(distance: number): number {
  return 1 + (BUG.farScale - 1) * smoothstep(BUG.scaleFrom, BUG.scaleTo, Number.isFinite(distance) ? distance : 0)
}

/**
 * The point `along` steps into `points` (a fraction between two), on the
 * sphere, into `out`; held at either end.
 */
export function pointAlong(points: Vector3[], along: number, out = new Vector3()): Vector3 {
  if (points.length === 0) return out.set(0, 1, 0)
  const last = points.length - 1
  const a = Math.min(last, Math.max(0, Number.isFinite(along) ? along : 0))
  const i = Math.min(last - 1, Math.floor(a))
  if (i < 0) return out.copy(points[0])
  return out.copy(points[i]).lerp(points[i + 1], a - i).normalize()
}
