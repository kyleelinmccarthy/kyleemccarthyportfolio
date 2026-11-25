import { Vector3 } from 'three'
import { DRAGON } from '@/content/eggs'
import type { District, Place } from '@/content/types'
import { FIRM_GROUND } from './characters'
import { D2R, angleDeg, dirOf } from './geo'
import { landmarkTop } from './labels'
import { mulberry32, WORLD_SEED } from './rng'
import { landValue } from './terrain'

/*
 * The dragon die easter egg's flight, as data: how high it flies, where it is
 * at any moment of its loop round the planet, which way it faces and leans, how
 * its wings beat, and where it holds still under reduced motion. Pure: three's
 * maths only, and the same for one seed and one moment, so time may jump.
 */

/** The dragon die's seed: its loop's first plane and where on it it starts. */
export const DRAGON_SEED = WORLD_SEED + 29

/** What the dragon die may draw, outlines included: the kit's d20, its eyes, its tail and its two wings. */
export const DRAGON_TRIANGLE_BUDGET = 3_500
/** Draw calls for the dragon die once batched: one per material its body uses, plus its two wings, which beat. */
export const DRAGON_DRAW_BUDGET = 8

/** How far either side of a moment its heading is read from, in seconds. */
const LOOK = 0.05
/** How far its lean follows its turning: radians of lean for each radian a second it turns. */
const LEAN = 4
/** How long its wings take to start and stop beating, in seconds. */
const EASE = 0.2

/** How high the dragon die flies: over the tallest landmark's top by `DRAGON.above`, from the planet's centre in world units. */
export function dragonRadius(places: Place[], districts: District[]): number {
  return Math.max(1, ...places.map((p) => landmarkTop(p, districts).length())) + DRAGON.above
}

/** The loop for one seed: the plane it starts in (a normal and two ways across it), and where on it it starts (radians). */
function loopOf(seed: number) {
  const rand = mulberry32(seed)
  const normal = new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1)
  if (normal.lengthSq() < 1e-6) normal.set(0, 1, 0)
  normal.normalize()
  const u = new Vector3(0, 1, 0).cross(normal)
  if (u.lengthSq() < 1e-6) u.set(1, 0, 0).cross(normal)
  u.normalize()
  const v = new Vector3().crossVectors(normal, u)
  return { normal, u, v, start: rand() * Math.PI * 2, tip: rand() * Math.PI * 2 }
}

const loops = new Map<number, ReturnType<typeof loopOf>>()
const loop = (seed: number) => loops.get(seed) ?? loops.set(seed, loopOf(seed)).get(seed)!

/** Where it is at `t` seconds, as a direction from the centre, into `out`. */
function dirAt(seed: number, t: number, out: Vector3): Vector3 {
  const { normal, u, v, start, tip } = loop(seed)
  const time = Number.isFinite(t) ? t : 0
  // The loop's plane, tipped `wobble` toward a way that goes round once every `wobblePeriod`.
  const turn = tip + (time / DRAGON.wobblePeriod) * Math.PI * 2
  const w = DRAGON.wobble * D2R
  const n = normal.clone().multiplyScalar(Math.cos(w)).addScaledVector(u, Math.sin(w) * Math.cos(turn)).addScaledVector(v, Math.sin(w) * Math.sin(turn))
  // Across the tipped plane: `u` made square to it, and the way a quarter round from that.
  const e1 = u.clone().addScaledVector(n, -u.dot(n)).normalize()
  const e2 = new Vector3().crossVectors(n, e1)
  const a = start + DRAGON.speed * D2R * time
  return out.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a))
}

/** The way it flies at `t`, flat to the ground under it (a unit vector), into `out`. */
function aheadAt(seed: number, t: number, out: Vector3): Vector3 {
  const up = dirAt(seed, t, new Vector3())
  const after = dirAt(seed, t + LOOK, new Vector3())
  out.subVectors(after, dirAt(seed, t - LOOK, new Vector3()))
  return out.addScaledVector(up, -out.dot(up)).normalize()
}

/**
 * Where the dragon die is at `t` seconds, flying `radius` from the centre (world
 * units), bobbing a little as it goes, and the way it flies, flat to the
 * ground under it.
 */
export function dragonAt(seed: number, t: number, radius: number, out = { at: new Vector3(), ahead: new Vector3() }): { at: Vector3; ahead: Vector3 } {
  const time = Number.isFinite(t) ? t : 0
  const height = radius + DRAGON.bob * Math.sin(time * DRAGON.bobs * Math.PI * 2)
  dirAt(seed, time, out.at).multiplyScalar(height)
  aheadAt(seed, time, out.ahead)
  return out
}

/** How far it leans into its turn at `t`, in radians (positive leaning right): with how fast it turns, never past `DRAGON.bank`. */
export function dragonBank(seed: number, t: number): number {
  const time = Number.isFinite(t) ? t : 0
  const up = dirAt(seed, time, new Vector3())
  const before = aheadAt(seed, time - 0.5, new Vector3())
  const after = aheadAt(seed, time + 0.5, new Vector3())
  // Turning toward its left (anticlockwise seen from above) is a positive turn about its up; it leans the other way, into it.
  const rate = Math.atan2(new Vector3().crossVectors(before, after).dot(up), before.dot(after))
  return Math.max(-DRAGON.bank, Math.min(DRAGON.bank, -rate * LEAN))
}

/**
 * How far a wing is turned up from flat at `t`, in radians: beating about its
 * tilt while it flaps, held at the tilt while it glides, easing between the
 * two over a fifth of a second.
 */
export function dragonWing(t: number): number {
  const time = Number.isFinite(t) ? t : 0
  const cycle = DRAGON.flap + DRAGON.glide
  const r = ((time % cycle) + cycle) % cycle
  const flapping = r >= DRAGON.flap ? 0 : Math.max(0, Math.min(1, r / EASE, (DRAGON.flap - r) / EASE))
  return DRAGON.open + DRAGON.beat * Math.sin(time * DRAGON.beats * Math.PI * 2) * flapping
}

/**
 * Where it holds still under reduced motion, as a direction from the centre:
 * over firm land, as far as can be from every place (every 10 degrees tried),
 * so it never hangs over a landmark.
 */
export function dragonHold(places: Place[], districts: District[]): Vector3 {
  const homes = places.map((p) => dirOf(p.at))
  let best = { dir: new Vector3(0, 1, 0), clear: -1 }
  for (let lat = -60; lat <= 60; lat += 10) {
    for (let lon = -180; lon < 180; lon += 10) {
      const dir = dirOf({ lat, lon })
      if (landValue(dir, districts).v < FIRM_GROUND) continue
      const clear = Math.min(...homes.map((h) => angleDeg(dir, h)))
      if (clear > best.clear) best = { dir, clear }
    }
  }
  return best.dir
}
