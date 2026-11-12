import { Color, Vector3 } from 'three'
import { terrain } from '@/content/sky'
import type { District, DistrictId } from '@/content/types'
import { noise3 } from './rng'
import { SHORE, heightOfValue, landValue } from './terrain'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Just offshore the sea floor sits this far below sea level, so the coast never pokes through the water. */
const SHELF_DROP = 0.004
/** Further out it shelves down by this much more, reaching full depth this far below the shore value. */
const SHELF_DEPTH = 0.05
const SHELF_WIDTH = 0.14
/** Sand runs this far up the land value from the shore before the grass takes over. */
const SAND_TO_GRASS = { from: SHORE + 0.025, to: SHORE + 0.06 }
/** Each island's grass leans this far toward its district's colour. */
const DISTRICT_TINT = 0.1

/** Linear-space palette colours, parsed once. */
const grassA = new Color(terrain.grassA)
const grassB = new Color(terrain.grassB)
const sand = new Color(terrain.sand)

/** Each district's colour, parsed once per districts array so painting allocates nothing. */
const tintCache = new WeakMap<District[], Map<DistrictId, Color>>()
function tintsOf(districts: District[]): Map<DistrictId, Color> {
  let tints = tintCache.get(districts)
  if (!tints) {
    tints = new Map(districts.map((d) => [d.id, new Color(d.color)]))
    tintCache.set(districts, tints)
  }
  return tints
}

/** The ground's radius for a land value already in hand. */
function radiusOfValue(v: number): number {
  if (v >= SHORE) return 1 + heightOfValue(v)
  return 1 - SHELF_DROP - SHELF_DEPTH * smoothstep(SHORE, SHORE - SHELF_WIDTH, v)
}

/** The ground's colour for a direction whose land value and district are already in hand. */
function colorOfValue(dir: Vector3, v: number, district: DistrictId, districts: District[], out: Color): Color {
  out.copy(grassA).lerp(grassB, smoothstep(-0.3, 0.5, noise3(dir.x * 5, dir.y * 5, dir.z * 5)))
  const tint = tintsOf(districts).get(district)
  if (tint) out.lerp(tint, DISTRICT_TINT)
  return out.lerp(sand, 1 - smoothstep(SAND_TO_GRASS.from, SAND_TO_GRASS.to, v))
}

/**
 * The ground's distance from the centre along a unit direction. On land it is
 * 1 + `heightAt`, so a landmark placed with `heightAt` stands exactly on it.
 * Offshore the sea floor drops just below the water and shelves to 0.946.
 */
export function landRadius(dir: Vector3, districts: District[]): number {
  return radiusOfValue(landValue(dir, districts).v)
}

/**
 * The ground's colour along a unit direction, written into `out`: two greens
 * blended by noise and leaning toward the district's colour, giving way to
 * sand at the shore and under the sea.
 */
export function landColor(dir: Vector3, districts: District[], out: Color): Color {
  const { v, district } = landValue(dir, districts)
  return colorOfValue(dir, v, district, districts, out)
}

/**
 * The land mesh's vertex data for a list of unit directions (x, y, z per
 * vertex): each direction pushed out to the ground, and the ground's colour
 * there in linear RGB. The land is evaluated once per direction. Plain typed
 * arrays in and out, so a worker could run it.
 */
export function buildLand(directions: Float32Array, districts: District[]): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(directions.length)
  const colors = new Float32Array(directions.length)
  const dir = new Vector3()
  const color = new Color()
  for (let i = 0; i < directions.length; i += 3) {
    dir.set(directions[i], directions[i + 1], directions[i + 2])
    const { v, district } = landValue(dir, districts)
    const r = radiusOfValue(v)
    positions[i] = dir.x * r
    positions[i + 1] = dir.y * r
    positions[i + 2] = dir.z * r
    colorOfValue(dir, v, district, districts, color)
    colors[i] = color.r
    colors[i + 1] = color.g
    colors[i + 2] = color.b
  }
  return { positions, colors }
}

/** The land value under each unit direction (x, y, z per vertex): what the sea colours its depth and surf by. */
export function shoreValues(directions: Float32Array, districts: District[]): Float32Array {
  const values = new Float32Array(directions.length / 3)
  const dir = new Vector3()
  for (let i = 0; i < values.length; i++) values[i] = landValue(dir.set(directions[i * 3], directions[i * 3 + 1], directions[i * 3 + 2]), districts).v
  return values
}

/** Directions closer than this on every axis are one vertex. Far finer than any icosphere edge used here. */
const MERGE_STEP = 2e-5
/** Quantised coordinates span [0, 2 / MERGE_STEP] = [0, 100000], under 2^17, so three pack into one exact number. */
const AXIS = 131072

/**
 * Collapses repeated directions (a non-indexed sphere repeats each vertex in
 * every triangle round it, about six times) into one list of unique
 * directions and an index that rebuilds the triangles from it, so each
 * direction is evaluated once.
 */
export function indexDirections(directions: Float32Array): { directions: Float32Array; index: Uint32Array } {
  const count = directions.length / 3
  const index = new Uint32Array(count)
  const seen = new Map<number, number>()
  const unique = new Float32Array(directions.length)
  let next = 0
  for (let i = 0; i < count; i++) {
    const x = directions[i * 3], y = directions[i * 3 + 1], z = directions[i * 3 + 2]
    const key =
      (Math.round((x + 1) / MERGE_STEP) * AXIS + Math.round((y + 1) / MERGE_STEP)) * AXIS + Math.round((z + 1) / MERGE_STEP)
    let at = seen.get(key)
    if (at === undefined) {
      at = next++
      seen.set(key, at)
      unique[at * 3] = x
      unique[at * 3 + 1] = y
      unique[at * 3 + 2] = z
    }
    index[i] = at
  }
  return { directions: unique.slice(0, next * 3), index }
}
