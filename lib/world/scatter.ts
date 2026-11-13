import { Vector3 } from 'three'
import { scatter } from '@/content/sky'
import type { District, DistrictId, Place } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { D2R, angleDeg, dirOf, greatCircle, latLonOf, surfaceFrame } from './geo'
import { footprintRadius } from './kit'
import { placeGoal } from './rig'
import { WORLD_SEED, mulberry32 } from './rng'
import { anywhere } from './starfield'
import { heightAt, landValue } from './terrain'

/**
 * The seeds the drawn layers use, each its own stream and apart from the stars'
 * and clouds' (`WORLD_SEED`, +1 and +2). The component and the tests both read
 * these, so a test always checks the layout that is drawn.
 */
export const SCATTER_SEEDS = { trees: WORLD_SEED + 3, blocks: WORLD_SEED + 4 } as const

/** Degrees of arc on the ground per model unit (a landmark's units, `MODEL_SCALE` world units each). */
export const MODEL_DEG = MODEL_SCALE / D2R

/** A number between `a` and `b`, `t` of the way. */
const mix = ([a, b]: readonly [number, number], t: number) => a + (b - a) * t

/* ───────────── trees ───────────── */

/** A broad round canopy, a taller narrow one, or a conifer of stacked tiers. */
export type TreeForm = 'round' | 'tall' | 'conifer'

/**
 * One tree, in model units (as a landmark's, ground at 0): where it stands,
 * its form, the canopy's radius across the ground, how tall it stands
 * altogether (an upper bound the shape keeps under), how tall its trunk is
 * before the leaves begin, its turn about the upright, its leaf colour, and a
 * seed for the shape of its canopy.
 */
export interface Tree {
  dir: Vector3
  form: TreeForm
  radius: number
  height: number
  trunk: number
  yaw: number
  color: string
  seed: number
}

/**
 * Each form's canopy radius and trunk height (model units, picked between the
 * two), and how tall the whole tree stands for its radius and trunk: the
 * shapes (`lib/world/scatterShapes.ts`) stay under it, which a test checks.
 * A round canopy is a little squashed; a tall one is stacked about three radii
 * high; a conifer is three tiers.
 */
export const TREE_FORMS = {
  round: { radius: [0.24, 0.32], trunk: [0.14, 0.2], tall: 1.45 },
  tall: { radius: [0.16, 0.2], trunk: [0.1, 0.14], tall: 3.3 },
  conifer: { radius: [0.24, 0.3], trunk: [0.08, 0.12], tall: 2.45 },
} as const satisfies Record<TreeForm, { radius: readonly [number, number]; trunk: readonly [number, number]; tall: number }>

/**
 * The share of the trees each form takes. A tree joining a grove usually
 * takes its form, but never past its form's share: then it takes whichever
 * form is furthest short of its own (a test holds the drawn mix to these).
 */
export const FORM_SHARE: ReadonlyArray<readonly [TreeForm, number]> = [
  ['round', 0.6],
  ['tall', 0.12],
  ['conifer', 0.28],
]

/**
 * How many trees there are. Fewer than the 210 round balls they replace: each
 * is a shaped tree now, bigger and dearer to draw, and they stand in groves
 * rather than sprinkled evenly.
 */
export const TREE_COUNT = 140
/** The most draws the tree layout may take before it settles for what it has. */
const TREE_ATTEMPTS = 20000
/** Trees grow only where the land value is well above the shore. */
const TREE_MIN_LAND = 0.33
/**
 * Trees keep at least this far (degrees) from a landmark, and from The Works'
 * centre, which is the city; and always far enough that the whole canopy
 * clears the landmark's allowed footprint.
 */
export const TREE_CLEAR = { place: 7.5, city: 17 } as const
/**
 * Groves: most trees grow beside one already planted (`join`), between `near`
 * times their two reaches from it; most take its form (`sameForm`), and most
 * of a blossom or autumn grove stay so (`sameAccent`). Two trees' middles keep
 * at least `apart` of their two reaches between them, so canopies may touch
 * but no tree stands inside another.
 */
const GROVE = { join: 0.62, near: [0.95, 1.35] as const, sameForm: 0.7, sameAccent: 0.5, apart: 0.82 }
/**
 * The accent trees: blossom round The Studio and Home, a few turning trees in
 * After Hours. `share` of the trees that start a grove there take one.
 */
const ACCENTS: Partial<Record<DistrictId, { colors: readonly string[]; share: number }>> = {
  studio: { colors: scatter.blossom, share: 0.25 },
  home: { colors: scatter.blossom, share: 0.18 },
  hours: { colors: scatter.autumn, share: 0.2 },
}

/** How far a tree's canopy reaches from its middle across the ground, in model units. */
function treeReach(form: TreeForm, radius: number): number {
  return form === 'conifer' ? radius : radius * 1.08
}

/* ───────────── buildings ───────────── */

/** A city block of one to three storeys, a slim tower, or a small house with a pitched roof. */
export type BuildingForm = 'block' | 'tower' | 'house'

/** What stands on a flat roof: a water tank, a stair hut, a skylight, or nothing. */
export type Rooftop = 'tank' | 'hut' | 'skylight' | 'none'

/**
 * One background building, in model units: where it stands, its form, its
 * walls' width (across, before its turn) and depth, its storeys, how tall it
 * stands altogether, its turn about the upright, its wall, trim and roof
 * colours, what stands on a flat roof and where (`rooftopAt`, each axis -1 to
 * 1 across the room the roof leaves), and a seed for its windows.
 */
export interface Building {
  dir: Vector3
  form: BuildingForm
  width: number
  depth: number
  storeys: number
  height: number
  yaw: number
  wall: string
  trim: string
  roof: string
  rooftop: Rooftop
  rooftopAt: [number, number]
  seed: number
}

/** How tall each rooftop detail stands above the roof deck, in model units, and how often each is chosen. */
export const ROOFTOP: Record<Rooftop, { height: number; share: number }> = {
  tank: { height: 0.13, share: 0.25 },
  hut: { height: 0.1, share: 0.3 },
  skylight: { height: 0.03, share: 0.2 },
  none: { height: 0, share: 0.25 },
}

/** A rooftop detail by `ROOFTOP`'s shares, picked by `t` in [0, 1). */
function pickRooftop(t: number): Rooftop {
  let sum = 0
  for (const [kind, { share }] of Object.entries(ROOFTOP) as Array<[Rooftop, { share: number }]>) {
    sum += share
    if (t < sum) return kind
  }
  return 'none'
}

/** Where a rooftop detail stands, each axis -1 to 1: always toward a corner or an edge, never in the middle. */
function rooftopSpot(a: number, b: number): [number, number] {
  const side = (t: number) => (t < 0.5 ? -1 : 1) * (0.45 + (t < 0.5 ? t : t - 0.5) * 1.1)
  return [side(a), (b - 0.5) * 2]
}

/**
 * How the background buildings are put together, in model units: a storey,
 * the plinth they stand on, the parapet cap on a flat roof and how far it
 * oversails the walls, the box on a flat roof, and each form's sizes. A
 * house's roof rises `rise` above its walls and overhangs them by `overhang`.
 */
export const BUILDING = {
  storey: 0.34,
  plinth: 0.05,
  cap: 0.05,
  capOver: 0.022,
  /** How far a flat roof's deck stands above its parapet, and how far inside it. */
  deck: { lift: 0.008, inset: 0.035 },
  block: { width: [0.36, 0.5] as const, depth: [0.34, 0.48] as const, storeys: [1, 3] as const },
  tower: { width: [0.3, 0.36] as const, storeys: [3, 4] as const },
  house: { width: [0.4, 0.5] as const, depth: [0.3, 0.36] as const, storeys: 1, rise: [0.15, 0.2] as const, overhang: 0.035 },
  /** The smallest block a cell near a landmark may shrink to before it is left empty. */
  smallest: 0.3,
} as const

/** How tall a building stands: plinth, storeys, and a parapet and its rooftop detail or a pitched roof `rise` tall. */
export function buildingHeight(form: BuildingForm, storeys: number, rise: number = BUILDING.house.rise[1], rooftop: Rooftop = 'tank'): number {
  const walls = BUILDING.plinth + storeys * BUILDING.storey
  return form === 'house' ? walls + rise : walls + BUILDING.cap + BUILDING.deck.lift + ROOFTOP[rooftop].height
}

/** How far a building reaches from its middle across the ground, whatever its turn: half its diagonal, with its parapet or eaves. */
function buildingReach(form: BuildingForm, width: number, depth: number): number {
  const over = form === 'house' ? BUILDING.house.overhang : BUILDING.capOver
  return Math.hypot(width / 2 + over, depth / 2 + over)
}

/** What a building's footprint needs: where it stands, its turn, its walls and its form (for its parapet or eaves). */
type Footprint = Pick<Building, 'dir' | 'yaw' | 'width' | 'depth' | 'form'>

/**
 * A building's footprint as four corners in model units on the ground plane at
 * `origin` (x east, z south): its walls with their parapet or eaves, turned by
 * its yaw about the upright, as its mesh is.
 */
function footprintCorners(b: Footprint, origin: Vector3): Array<[number, number]> {
  const { east, south } = surfaceFrame(origin)
  const off = b.dir.clone().sub(origin)
  const cx = off.dot(east) / MODEL_SCALE
  const cz = off.dot(south) / MODEL_SCALE
  const over = b.form === 'house' ? BUILDING.house.overhang : BUILDING.capOver
  const hx = b.width / 2 + over
  const hz = b.depth / 2 + over
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  const corner = (x: number, z: number): [number, number] => [cx + x * c + z * s, cz - x * s + z * c]
  return [corner(-hx, -hz), corner(hx, -hz), corner(hx, hz), corner(-hx, hz)]
}

/**
 * The street between two buildings' footprints, in model units, along the
 * axis that separates them best (negative when they overlap). Measured on the
 * ground plane at the first one, which is true enough for neighbours.
 */
export function footprintGap(a: Footprint, b: Footprint): number {
  const p = footprintCorners(a, a.dir)
  const q = footprintCorners(b, a.dir)
  let best = -Infinity
  for (const poly of [p, q]) {
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i]!
      const [x2, y2] = poly[(i + 1) % 4]!
      const l = Math.hypot(x2 - x1, y2 - y1) || 1
      const nx = -(y2 - y1) / l
      const ny = (x2 - x1) / l
      let pMin = Infinity
      let pMax = -Infinity
      let qMin = Infinity
      let qMax = -Infinity
      for (const [x, y] of p) {
        const d = x * nx + y * ny
        pMin = Math.min(pMin, d)
        pMax = Math.max(pMax, d)
      }
      for (const [x, y] of q) {
        const d = x * nx + y * ny
        qMin = Math.min(qMin, d)
        qMax = Math.max(qMax, d)
      }
      best = Math.max(best, qMin - pMax, pMin - qMax)
    }
  }
  return best
}

/** True when `b` keeps at least a `STREET` from every one of `others` near it. */
function streetClear(b: Footprint, others: Footprint[]): boolean {
  return others.every((o) => angleDeg(b.dir, o.dir) > 6 || footprintGap(b, o) >= STREET)
}

/** How far a tree or building reaches from its middle across the ground, in model units. */
export function reachOf(x: Tree | Building): number {
  return 'trunk' in x ? treeReach(x.form, x.radius) : buildingReach(x.form, x.width, x.depth)
}

/**
 * The city's skyline: `towers` of the cells take a tower, but none within
 * `beside` degrees of a landmark, where buildings keep to `besideStoreys`.
 */
const CITY = { towers: 0.25, beside: 10, besideStoreys: 2 }

/**
 * The grid in The Works: this many steps either side of the centre, this many
 * degrees apart, about `fill` of the cells built on, each building nudged up
 * to `jitter` of a step off its cell's middle either way, so the city does
 * not stand in file.
 */
export const GRID = { reach: 5, step: 3.3, fill: 0.74, minLand: 0.4, jitter: 0.28 } as const
/** The least street between two buildings' footprints (walls with parapet or eaves), in model units. */
export const STREET = 0.06
/** Where the city crowds, it thins: no building keeps more than `most` others within `within` degrees. */
export const CITY_CROWD = { within: 1.5 * GRID.step, most: 4 } as const
/**
 * Buildings keep at least this far (degrees) from a landmark, and always far
 * enough that the whole building clears its allowed footprint.
 */
export const BLOCK_CLEAR = 7
/** How many tries each other district gets at a small house, and the least gap (degrees) between two of them. */
const OUTLYING = { tries: 16, gap: 0.6 }
/** The most buildings the layout can hold: the whole grid and every outlying try. */
export const BLOCK_COUNT_MAX = (2 * GRID.reach + 1) ** 2 + 4 * OUTLYING.tries

/* ───────────── clearances ───────────── */

const district = (districts: District[], id: DistrictId): District => {
  const found = districts.find((d) => d.id === id)
  if (!found) throw new Error(`no district ${id}`)
  return found
}

/**
 * True where something reaching `reachDeg` degrees from `dir` clears every
 * place: its middle at least `least` degrees away, and its edge outside the
 * place's allowed footprint.
 */
export function clearOfPlaces(dir: Vector3, reachDeg: number, places: Place[], least: number): boolean {
  for (const p of placeFootprints(places)) if (angleDeg(dir, p.dir) < Math.max(least, p.reachDeg + reachDeg)) return false
  return true
}

/** Every place's direction and how far its allowed footprint reaches in degrees, worked out once per places array. */
const footprintCache = new WeakMap<Place[], Array<{ dir: Vector3; reachDeg: number }>>()
function placeFootprints(places: Place[]): Array<{ dir: Vector3; reachDeg: number }> {
  let found = footprintCache.get(places)
  if (!found) {
    found = places.map((p) => ({ dir: dirOf(p.at), reachDeg: footprintRadius(p.id, places) * MODEL_DEG }))
    footprintCache.set(places, found)
  }
  return found
}

/**
 * True where something reaching `reachDeg` degrees from `dir` stands clear of
 * The Works' grid: outside the square of every cell, with half a step round
 * the outer ones, so the far corner cells are kept clear as well as the rest.
 */
export function offCityGrid(dir: Vector3, reachDeg: number, districts: District[]): boolean {
  const centre = district(districts, 'works').center
  const { lat, lon } = latLonOf(dir)
  const dLon = ((((lon - centre.lon) % 360) + 540) % 360) - 180
  const half = (GRID.reach + 0.5) * GRID.step + reachDeg
  return Math.abs(lat - centre.lat) > half || Math.abs(dLon * Math.cos(lat * D2R)) > half
}

/** Every grid cell's middle, used or not. */
export function gridCells(districts: District[]): Vector3[] {
  const centre = district(districts, 'works').center
  const cells: Vector3[] = []
  for (let i = -GRID.reach; i <= GRID.reach; i++) {
    for (let j = -GRID.reach; j <= GRID.reach; j++) {
      const lat = centre.lat + i * GRID.step
      // A step of longitude shrinks towards the poles, so the grid stays square on the ground.
      cells.push(dirOf({ lat, lon: centre.lon + (j * GRID.step) / Math.cos(lat * D2R) }))
    }
  }
  return cells
}

/** How far below a route anything under it keeps its top, in world units (about half a storey). */
export const ROUTE_HEADROOM = 0.02
/** Points along each route that the headroom is checked at. */
const ROUTE_SAMPLES = 240
/** Every sampled point of every route, as its direction from the centre and its distance, worked out once per districts array. */
const routeCache = new WeakMap<District[], Array<{ dir: Vector3; length: number }>>()

function routePoints(districts: District[]): Array<{ dir: Vector3; length: number }> {
  let points = routeCache.get(districts)
  if (!points) {
    points = routes(districts)
      .flatMap((r) => Array.from({ length: ROUTE_SAMPLES + 1 }, (_, k) => r.at(k / ROUTE_SAMPLES)))
      .map((p) => ({ length: p.length(), dir: p.clone().normalize() }))
    routeCache.set(districts, points)
  }
  return points
}

/**
 * The lowest any route passes over the ground within `reachDeg` degrees of
 * `dir` (a little more, for the route's own width), as a distance from the
 * planet's centre; Infinity where none does.
 */
export function routeCeiling(dir: Vector3, reachDeg: number, districts: District[]): number {
  let lowest = Infinity
  // Within the angle is the same as a dot product of at least its cosine, which needs no arc-cosine per point.
  const least = Math.cos(Math.min(180, reachDeg + 1) * D2R)
  for (const p of routePoints(districts)) {
    if (p.length < lowest && dir.dot(p.dir) >= least) lowest = p.length
  }
  return lowest
}

/** How tall (model units) something may stand at `dir` under the routes: its top `ROUTE_HEADROOM` below the lowest route over it. */
export function headroom(dir: Vector3, reachDeg: number, districts: District[]): number {
  return (routeCeiling(dir, reachDeg, districts) - ROUTE_HEADROOM - 1 - heightAt(dir, districts)) / MODEL_SCALE
}

/** Places within this many degrees of a building are the ones whose cameras it could stand in front of. */
const VIEW_NEAR = 30
/** Heights up each landmark, as shares of its height, at which its middle and both sides must stay in sight from its place's camera. */
const VIEW_POINTS = [0.08, 0.5, 0.95] as const
/** Steps along each sight line. */
const VIEW_STEPS = 48

/** Each place's camera (where it lands, facing the landmark from the south) and the points of its landmark it must see. */
const viewCache = new WeakMap<Place[], Map<District[], Array<{ dir: Vector3; eye: Vector3; marks: Vector3[] }>>>()
function placeViews(places: Place[], districts: District[]): Array<{ dir: Vector3; eye: Vector3; marks: Vector3[] }> {
  let byDistricts = viewCache.get(places)
  if (!byDistricts) viewCache.set(places, (byDistricts = new Map()))
  let views = byDistricts.get(districts)
  if (!views) {
    views = places.map((p) => {
      const dir = dirOf(p.at)
      const ground = dir.clone().multiplyScalar(1 + heightAt(dir, districts))
      // Across its width too: the camera faces it from the south, so its sides are east and west, out to its allowed footprint.
      const { east } = surfaceFrame(dir)
      const side = footprintRadius(p.id, places) * MODEL_SCALE
      const marks = VIEW_POINTS.flatMap((k) => {
        const mid = ground.clone().addScaledVector(dir, k * p.height * MODEL_SCALE)
        return [mid, mid.clone().addScaledVector(east, side), mid.clone().addScaledVector(east, -side)]
      })
      return { dir, eye: placeGoal(p, districts).position, marks }
    })
    byDistricts.set(districts, views)
  }
  return views
}

/**
 * True where a building at `dir`, reaching `reachDeg` degrees and `height`
 * model units tall, would stand between a nearby place's camera (as it lands,
 * facing its landmark) and some part of that landmark: its foot, its middle or
 * its top, on its centre line or at either side of its allowed footprint. The
 * building is taken as an upright cylinder from the ground.
 */
export function blocksView(dir: Vector3, reachDeg: number, height: number, places: Place[], districts: District[]): boolean {
  const ground = 1 + heightAt(dir, districts)
  const top = ground + height * MODEL_SCALE
  const within = Math.cos(reachDeg * D2R)
  const near = Math.cos(VIEW_NEAR * D2R)
  const s = new Vector3()
  for (const view of placeViews(places, districts)) {
    if (view.dir.dot(dir) < near) continue
    for (const mark of view.marks) {
      for (let k = 1; k < VIEW_STEPS; k++) {
        s.lerpVectors(view.eye, mark, k / VIEW_STEPS)
        const r = s.length()
        if (r > top || r < ground - 0.002) continue
        if (s.dot(dir) / r >= within) return true
      }
    }
  }
  return false
}

/** `dir` moved `deg` degrees across the ground, toward `bearing` radians from east. */
function stepFrom(dir: Vector3, bearing: number, deg: number): Vector3 {
  const { up, east, south } = surfaceFrame(dir)
  const across = east.multiplyScalar(Math.cos(bearing)).addScaledVector(south, Math.sin(bearing))
  return up.multiplyScalar(Math.cos(deg * D2R)).addScaledVector(across, Math.sin(deg * D2R)).normalize()
}

/** Something already standing, as the clearance checks need it: where, and how far it reaches in degrees. */
interface Standing {
  dir: Vector3
  reachDeg: number
}

const clearOf = (dir: Vector3, reachDeg: number, others: Standing[], gapDeg: number, share = 1) =>
  others.every((o) => angleDeg(dir, o.dir) >= (reachDeg + o.reachDeg) * share + gapDeg)

/* ───────────── the layouts ───────────── */

/** One of `list`, picked by `t` in [0, 1). */
const pick = <T>(list: readonly T[], t: number): T => list[Math.min(list.length - 1, Math.floor(t * list.length))]

/** A tree form by `FORM_SHARE`, picked by `t` in [0, 1). */
function pickForm(t: number): TreeForm {
  let sum = 0
  for (const [form, share] of FORM_SHARE) {
    sum += share
    if (t < sum) return form
  }
  return 'round'
}

/**
 * Trees on every island but the city, the same on every visit, in groves:
 * most grow beside one already planted, taking its form and, for blossom or
 * autumn, its colour, and the rest start a grove of their own somewhere new.
 * Each is kept only if it is well inland, clear of every landmark's footprint,
 * off The Works' grid, clear of every building in `buildings`, not inside
 * another tree, and low enough to pass under any route above it. Broad-leaved
 * trees take one of the palette's greens, conifers one of theirs; the accent
 * districts' groves sometimes blossom or turn.
 */
export function scatterTrees(seed: number, districts: District[], places: Place[], buildings: Building[]): Tree[] {
  const rand = mulberry32(seed)
  const city = dirOf(district(districts, 'works').center)
  const built: Standing[] = buildings.map((b) => ({ dir: b.dir, reachDeg: reachOf(b) * MODEL_DEG }))
  const trees: Tree[] = []
  const planted: Standing[] = []
  const accented: boolean[] = []
  const counts = new Map<TreeForm, number>()
  const quota = (form: TreeForm) => Math.round((FORM_SHARE.find(([f]) => f === form)?.[1] ?? 0) * TREE_COUNT)

  for (let tries = 0; trees.length < TREE_COUNT && tries < TREE_ATTEMPTS; tries++) {
    const r = Array.from({ length: 10 }, rand)
    const joins = trees.length > 0 && r[0] < GROVE.join
    const parentAt = Math.floor(r[1] * trees.length)
    const parent = joins ? trees[parentAt] : null

    let form = parent && r[2] < GROVE.sameForm ? parent.form : pickForm(r[9])
    // Never past a form's share: then the form furthest short of its own.
    if ((counts.get(form) ?? 0) >= quota(form)) form = FORM_SHARE.reduce((best, [f]) => (quota(f) - (counts.get(f) ?? 0) > quota(best) - (counts.get(best) ?? 0) ? f : best), form)
    const spec = TREE_FORMS[form]
    const radius = mix(spec.radius, r[3])
    const reachDeg = treeReach(form, radius) * MODEL_DEG
    const dir = parent ? stepFrom(parent.dir, r[4] * Math.PI * 2, (reachDeg + planted[parentAt].reachDeg) * mix(GROVE.near, r[5])) : anywhere(rand)

    const { v, district: whose } = landValue(dir, districts)
    if (v <= TREE_MIN_LAND || angleDeg(dir, city) <= TREE_CLEAR.city || !offCityGrid(dir, reachDeg, districts)) continue
    if (!clearOfPlaces(dir, reachDeg, places, TREE_CLEAR.place)) continue
    if (!clearOf(dir, reachDeg, built, 0) || !clearOf(dir, reachDeg, planted, 0, GROVE.apart)) continue

    const trunk = mix(spec.trunk, r[6])
    const height = trunk + radius * spec.tall
    if (height > headroom(dir, reachDeg, districts)) continue

    const accent = ACCENTS[whose]
    const accentedNow = form === 'round' && accent !== undefined && (parent ? accented[parentAt] && r[7] < GROVE.sameAccent : r[7] < accent.share)
    const palette = form === 'conifer' ? scatter.conifer : accentedNow && accent ? accent.colors : scatter.leaf
    trees.push({ dir, form, radius, height, trunk, yaw: r[8] * Math.PI * 2, color: pick(palette, (r[8] * 7.31) % 1), seed: Math.floor(r[5] * 2 ** 31) })
    counts.set(form, (counts.get(form) ?? 0) + 1)
    planted.push({ dir, reachDeg })
    accented.push(accentedNow)
  }
  return trees
}

/**
 * Background buildings: in The Works, round a grid of 3.3 degree cells (about
 * a quarter left empty, none on water), each building nudged off its cell's
 * middle (`GRID.jitter`) and square to the grid: city blocks of one to three
 * storeys and slim towers of three or four, the tallest kept back from the
 * landmarks; then a few small houses with pitched roofs in each other
 * district. A building near a landmark, or crowding one already placed (a
 * `STREET` between footprints), shrinks until it clears, or the spot stays
 * empty; one under a route, or in front of a landmark seen from its place's
 * camera (`blocksView`), loses storeys until it is not. The city is then
 * thinned where it crowds (`thinCity`) and its flat roofs varied between
 * neighbours (`varyRoofs`).
 */
export function scatterBlocks(seed: number, districts: District[], places: Place[]): Building[] {
  const rand = mulberry32(seed)
  const city: Building[] = []

  for (const cell of gridCells(districts)) {
    const r = Array.from({ length: 13 }, rand)
    // Nudged off the cell's middle, so the city does not stand in file.
    const at = latLonOf(cell)
    const lat = at.lat + (r[9]! - 0.5) * 2 * GRID.jitter * GRID.step
    const dir = dirOf({ lat, lon: at.lon + ((r[10]! - 0.5) * 2 * GRID.jitter * GRID.step) / Math.cos(lat * D2R) })
    if (r[0]! >= GRID.fill || landValue(dir, districts).v <= GRID.minLand) continue
    // Beside a landmark the city stays low, so the landmark stands above it; towers rise only further off.
    const nearest = Math.min(...places.map((p) => angleDeg(dir, dirOf(p.at))))
    const beside = nearest < CITY.beside
    const form: BuildingForm = !beside && r[1]! < CITY.towers ? 'tower' : 'block'
    const spec = BUILDING[form]
    let width = mix(spec.width, r[2]!)
    let depth = form === 'tower' ? width : mix(BUILDING.block.depth, r[3]!)
    const yaw = r[5]! < 0.5 ? 0 : Math.PI / 2
    // Near a landmark, or crowding a building already placed, it narrows until it clears the footprint and keeps a street;
    // if it cannot, the cell stays empty.
    const clear = () =>
      clearOfPlaces(dir, buildingReach(form, width, depth) * MODEL_DEG, places, BLOCK_CLEAR) && streetClear({ dir, yaw, width, depth, form }, city)
    while (!clear() && Math.min(width, depth) > BUILDING.smallest) {
      width = Math.max(BUILDING.smallest, width - 0.02)
      depth = Math.max(BUILDING.smallest, depth - 0.02)
    }
    if (!clear()) continue
    const reachDeg = buildingReach(form, width, depth) * MODEL_DEG
    const rooftop = pickRooftop(r[11]!)
    const room = headroom(dir, reachDeg, districts)
    // Under the routes, and never in front of a landmark seen from its place: storeys come off until both hold.
    const fits = (storeys: number) => {
      const height = buildingHeight(form, storeys, 0, rooftop)
      return height <= room && !blocksView(dir, reachDeg, height, places, districts)
    }
    let storeys = Math.round(mix([spec.storeys[0], spec.storeys[1] + 0.99], r[4]!) - 0.49)
    if (beside) storeys = Math.min(storeys, CITY.besideStoreys)
    while (storeys > 1 && !fits(storeys)) storeys--
    if (!fits(storeys)) continue
    city.push({
      dir,
      form,
      width,
      depth,
      storeys,
      height: buildingHeight(form, storeys, 0, rooftop),
      yaw,
      wall: pick(scatter.walls, r[6]!),
      trim: pick(scatter.trim, r[7]!),
      roof: pick(scatter.roofs, r[12]!),
      rooftop,
      rooftopAt: rooftopSpot(r[8]!, r[12]!),
      seed: Math.floor(r[8]! * 2 ** 31),
    })
  }
  const buildings = thinCity(city)
  varyRoofs(buildings)

  const houses: Standing[] = []
  for (const id of ['frenzy', 'hours', 'studio', 'home'] as const) {
    const d = district(districts, id)
    for (let i = 0; i < OUTLYING.tries; i++) {
      const r = Array.from({ length: 10 }, rand)
      const dir = dirOf({ lat: d.center.lat + (r[0] - 0.5) * d.radius * 0.9, lon: d.center.lon + (r[1] - 0.5) * d.radius * 0.9 })
      const spec = BUILDING.house
      const width = mix(spec.width, r[2])
      const depth = mix(spec.depth, r[3])
      const reachDeg = buildingReach('house', width, depth) * MODEL_DEG
      if (landValue(dir, districts).v <= GRID.minLand || !clearOfPlaces(dir, reachDeg, places, BLOCK_CLEAR)) continue
      if (!clearOf(dir, reachDeg, houses, OUTLYING.gap)) continue
      if (!streetClear({ dir, yaw: r[6] * Math.PI * 2, width, depth, form: 'house' }, buildings)) continue
      const rise = mix(spec.rise, r[4])
      const storeys = spec.storeys
      const height = buildingHeight('house', storeys, rise)
      if (height > headroom(dir, reachDeg, districts) || blocksView(dir, reachDeg, height, places, districts)) continue
      houses.push({ dir, reachDeg })
      buildings.push({
        dir,
        form: 'house',
        width,
        depth,
        storeys,
        height,
        yaw: r[6] * Math.PI * 2,
        wall: pick(scatter.walls, r[7]),
        trim: pick(scatter.trim, r[8]),
        roof: pick(scatter.roofs, r[9]),
        rooftop: 'none',
        rooftopAt: [0, 0],
        seed: Math.floor(r[2] * 2 ** 31),
      })
    }
  }
  return buildings
}

/** The city buildings within `CITY_CROWD.within` degrees of `a`. */
const crowdOf = (a: Building, all: Building[]) => all.filter((b) => b !== a && angleDeg(a.dir, b.dir) < CITY_CROWD.within)

/**
 * Thins the city where it crowds: while some building has more than
 * `CITY_CROWD.most` others close round it, the most crowded goes (the later
 * one in the grid's order, of two as crowded). The rest keep their order.
 */
function thinCity(city: Building[]): Building[] {
  const kept = [...city]
  for (;;) {
    let worst = -1
    let worstCount: number = CITY_CROWD.most
    kept.forEach((b, i) => {
      const n = crowdOf(b, kept).length
      if (n > CITY_CROWD.most && n >= worstCount) {
        worstCount = n
        worst = i
      }
    })
    if (worst < 0) return kept
    kept.splice(worst, 1)
  }
}

/**
 * Gives each city building a flat roof unlike its close neighbours': it keeps
 * the one it was dealt unless a neighbour already has it, then takes the next
 * in the palette that none of them has (or the least used among them).
 */
function varyRoofs(city: Building[]): void {
  const done: Building[] = []
  for (const b of city) {
    const taken = crowdOf(b, done).map((n) => n.roof)
    const start = scatter.roofs.indexOf(b.roof as (typeof scatter.roofs)[number])
    const order = scatter.roofs.map((_, k) => scatter.roofs[(start + k) % scatter.roofs.length]!)
    b.roof = order.find((c) => !taken.includes(c)) ?? order.reduce((best, c) => (taken.filter((t) => t === c).length < taken.filter((t) => t === best).length ? c : best))
    done.push(b)
  }
}

const layoutCache = new WeakMap<Place[], Map<District[], { buildings: Building[]; trees: Tree[] }>>()

/**
 * The planet's buildings and trees, as drawn (`Scatter`) and as the camera at a
 * place keeps out of (`sceneryObstacles`): one layout from the scatter's seeds,
 * laid out once for the same places and districts and shared by both, so the
 * camera measures against what is actually there, and arriving at a place does
 * not lay it all out again.
 */
export function sceneryLayout(districts: District[], places: Place[]): { buildings: Building[]; trees: Tree[] } {
  let byDistricts = layoutCache.get(places)
  if (!byDistricts) layoutCache.set(places, (byDistricts = new Map()))
  let layout = byDistricts.get(districts)
  if (!layout) {
    const buildings = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
    layout = { buildings, trees: scatterTrees(SCATTER_SEEDS.trees, districts, places, buildings) }
    byDistricts.set(districts, layout)
  }
  return layout
}

/* ───────────── routes and the paddleboarder ───────────── */

/** The six routes, each from the district it leaves to the one it reaches. */
export const ROUTE_ARCS: ReadonlyArray<readonly [DistrictId, DistrictId]> = [
  ['works', 'frenzy'],
  ['works', 'hours'],
  ['frenzy', 'studio'],
  ['studio', 'home'],
  ['home', 'hours'],
  ['frenzy', 'home'],
]

/** A route runs between these fractions of the great circle, so it begins and ends clear of the islands' middles. */
const ROUTE_SPAN = { from: 0.06, to: 0.94 }
/** Height above the centre at the ends of the whole circle, and how much more it rises over the middle. */
const ROUTE_HEIGHT = { base: 1.09, rise: 0.13 }

export interface Route {
  from: DistrictId
  to: DistrictId
  /** A point on the route, `t` of the way along it from 0 to 1, in world units from the planet's centre. */
  at(t: number): Vector3
}

/**
 * Six arcs between the islands, lifted off the ground: they lie on the great
 * circle between two districts' centres and swell to 1.22 from the centre
 * over the middle, never lower than 1.09.
 */
export function routes(districts: District[]): Route[] {
  return ROUTE_ARCS.map(([from, to]) => {
    const a = dirOf(district(districts, from).center)
    const b = dirOf(district(districts, to).center)
    return {
      from,
      to,
      at(t) {
        const u = ROUTE_SPAN.from + (ROUTE_SPAN.to - ROUTE_SPAN.from) * t
        return greatCircle(a, b, u).normalize().multiplyScalar(ROUTE_HEIGHT.base + ROUTE_HEIGHT.rise * Math.sin(Math.PI * u))
      },
    }
  })
}

/** How the paddleboarder circles Home: radians a second, and the circle's radius as a multiple of the district's. */
const PADDLE = { turn: 0.12, ring: 1.02 }
/** The board's height above the centre, its bob, and the bob's rate (radians a second). A little above the sea, which is at 1. */
const BOARD = { height: 1.0008, bob: 0.0012, rate: 2 }

/**
 * Where the paddleboarder is `t` seconds in: going round Home on a circle just
 * outside its coast, on the water, with the board pointing along the way and
 * `up` square to the water (so always upright). `position` includes the bob.
 */
export function paddlePath(home: District, t: number): { position: Vector3; forward: Vector3; up: Vector3 } {
  const { up: centre, south, east } = surfaceFrame(dirOf(home.center))
  const rho = home.radius * PADDLE.ring * D2R
  const theta = t * PADDLE.turn
  const up = centre
    .clone()
    .multiplyScalar(Math.cos(rho))
    .addScaledVector(east, Math.sin(rho) * Math.cos(theta))
    .addScaledVector(south, Math.sin(rho) * Math.sin(theta))
    .normalize()
  const forward = east.clone().multiplyScalar(-Math.sin(theta)).addScaledVector(south, Math.cos(theta))
  forward.addScaledVector(up, -forward.dot(up)).normalize()
  const position = up.clone().multiplyScalar(BOARD.height + Math.sin(t * BOARD.rate) * BOARD.bob)
  return { position, forward, up }
}
