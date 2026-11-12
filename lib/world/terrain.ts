import type { Vector3 } from 'three'
import type { District, DistrictId, LatLon } from '@/content/types'
import { D2R, dirOf } from './geo'
import { noise3 } from './rng'

/** Land value at which the sea gives way to shore. */
export const SHORE = 0.2

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Each district's centre as a unit vector, built once per districts array so the hot path allocates nothing. */
const centreCache = new WeakMap<District[], Vector3[]>()
function centresOf(districts: District[]): Vector3[] {
  let centres = centreCache.get(districts)
  if (!centres) {
    centres = districts.map((d) => dirOf(d.center))
    centreCache.set(districts, centres)
  }
  return centres
}

/** Index of the district that won the last `evaluate` call. Safe because evaluation is synchronous. */
let winner = 0

/** Land value of a direction: the strongest district falloff plus two octaves of noise. Sets `winner`. */
function evaluate(dir: Vector3, districts: District[]): number {
  const centres = centresOf(districts)
  let best = -9
  winner = 0
  for (let i = 0; i < districts.length; i++) {
    const c = centres[i]
    const cos = Math.min(1, Math.max(-1, dir.x * c.x + dir.y * c.y + dir.z * c.z))
    const v = 1 - Math.acos(cos) / D2R / districts[i].radius
    if (v > best) {
      best = v
      winner = i
    }
  }
  return (
    best +
    noise3(dir.x * 3.3, dir.y * 3.3, dir.z * 3.3) * 0.15 +
    noise3(dir.x * 8.1, dir.y * 8.1, dir.z * 8.1) * 0.05
  )
}

/** How landlike a direction is, and which district's island it belongs to. Land where `v >= SHORE`. */
export function landValue(dir: Vector3, districts: District[]): { v: number; district: DistrictId } {
  const v = evaluate(dir, districts)
  return { v, district: districts[winner].id }
}

export function isLand(dir: Vector3, districts: District[]): boolean {
  return evaluate(dir, districts) >= SHORE
}

/** Height of the ground above sea level, as a fraction of the planet radius. Zero at sea. */
export function heightAt(dir: Vector3, districts: District[]): number {
  return heightOfValue(evaluate(dir, districts))
}

/** Height of the ground for a land value already in hand, so a caller with `landValue` need not evaluate twice. */
export function heightOfValue(v: number): number {
  return v < SHORE ? 0 : 0.012 + 0.02 * smoothstep(SHORE, 0.55, v)
}

/** The point on the ground at a latitude and longitude: sea level pushed out by the land's height. */
export function groundOf(at: LatLon, districts: District[]): Vector3 {
  const dir = dirOf(at)
  return dir.multiplyScalar(1 + heightAt(dir, districts))
}
