import { describe, it, expect } from 'vitest'
import type { Vector3 } from 'three'
import { landmark, scatter } from '@/content/sky'
import { districts, places } from '@/content/world'
import { D2R, angleDeg, dirOf, latLonOf, surfaceFrame } from '@/lib/world/geo'
import { MODEL_SCALE } from '@/lib/world/camera'
import { FOOTPRINT, blend, footprintRadius } from '@/lib/world/kit'
import {
  BLOCK_CLEAR,
  BLOCK_COUNT_MAX,
  BUILDING,
  CITY_CROWD,
  FORM_SHARE,
  GRID,
  blocksView,
  MODEL_DEG,
  ROUTE_ARCS,
  ROUTE_HEADROOM,
  SCATTER_SEEDS,
  STREET,
  TREE_CLEAR,
  TREE_COUNT,
  TREE_FORMS,
  buildingHeight,
  gridCells,
  offCityGrid,
  paddlePath,
  reachOf,
  routeCeiling,
  routes,
  scatterBlocks,
  scatterTrees,
  type Building,
  type Tree,
} from '@/lib/world/scatter'
import { heightAt, isLand, landValue } from '@/lib/world/terrain'
import { placeGoal } from '@/lib/world/rig'

const works = districts[0]!
const home = districts[4]!

/** The real seed and four others, so a layout rule does not hold by luck. */
const SEEDS = [SCATTER_SEEDS.blocks, 1, 7, 2026, 99991]
const where = (x: { dir: Vector3 }) => `${latLonOf(x.dir).lat.toFixed(2)},${latLonOf(x.dir).lon.toFixed(2)}`

/**
 * A building's footprint as the test sees it, independently of the layout: a
 * rectangle in model units in the ground plane at `origin` (x east, z south),
 * walls plus parapet (flat roofs) or eaves (houses), turned by its yaw as the
 * mesh is (about the upright).
 */
function corners(b: Building, origin: Vector3): Array<[number, number]> {
  const { east, south } = surfaceFrame(origin)
  const off = b.dir.clone().sub(origin)
  const cx = off.dot(east) / MODEL_SCALE
  const cz = off.dot(south) / MODEL_SCALE
  const over = b.form === 'house' ? BUILDING.house.overhang : BUILDING.capOver
  const hx = b.width / 2 + over
  const hz = b.depth / 2 + over
  // Model x is east and z south; a turn by yaw about +Y takes (x, z) to (x cos + z sin, -x sin + z cos).
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  return [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ].map(([x, z]) => [cx + x! * c + z! * s, cz - x! * s + z! * c] as [number, number])
}

/** The gap between two convex polygons along the best separating axis (negative when they overlap), by separating axes. */
function polygonGap(p: Array<[number, number]>, q: Array<[number, number]>): number {
  let best = -Infinity
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i]!
      const [x2, y2] = poly[(i + 1) % poly.length]!
      const l = Math.hypot(x2 - x1, y2 - y1)
      const n: [number, number] = [-(y2 - y1) / l, (x2 - x1) / l]
      const proj = (pts: Array<[number, number]>) => pts.map(([x, y]) => x * n[0] + y * n[1])
      const a = proj(p)
      const b = proj(q)
      best = Math.max(best, Math.min(...b) - Math.max(...a), Math.min(...a) - Math.max(...b))
    }
  }
  return best
}

/** The street between two buildings' footprints, in model units (negative when they overlap). */
const footprintGap = (a: Building, b: Building) => polygonGap(corners(a, a.dir), corners(b, a.dir))

/** How far a circle of `radius` (model units) at `dir` stands outside a building's footprint (negative when it reaches in). */
function circleToFootprint(dir: Vector3, radius: number, b: Building): number {
  const rect = corners(b, dir)
  // Distance from the circle's middle (the origin here) to the rectangle, then less the radius.
  const inside = polygonGap([[0, 0], [1e-9, 0], [0, 1e-9]], rect) < 0
  if (inside) return -radius
  let d = Infinity
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = rect[i]!
    const [x2, y2] = rect[(i + 1) % 4]!
    const t = Math.max(0, Math.min(1, -(x1 * (x2 - x1) + y1 * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)))
    d = Math.min(d, Math.hypot(x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
  }
  return d - radius
}

/** WCAG relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0)
}
/** How far a landmark's footprint reaches from its place, seen from the centre, in degrees. */
const FOOTPRINT_DEG = (FOOTPRINT.radius * MODEL_SCALE * 180) / Math.PI

describe('clearances', () => {
  it('keep trees and blocks at least 7 degrees from a place, clear of any landmark footprint', () => {
    expect(FOOTPRINT_DEG).toBeCloseTo(6.55, 1)
    expect(TREE_CLEAR.place).toBeGreaterThanOrEqual(7)
    expect(BLOCK_CLEAR).toBeGreaterThanOrEqual(7)
    expect(Math.min(TREE_CLEAR.place, BLOCK_CLEAR)).toBeGreaterThan(FOOTPRINT_DEG)
  })

  it("leave room between places, where no two places' allowed footprints overlap", () => {
    const apart = (a: (typeof places)[number], b: (typeof places)[number]) => (angleDeg(dirOf(a.at), dirOf(b.at)) * Math.PI) / 180 / MODEL_SCALE
    for (const a of places) {
      for (const b of places) {
        if (a !== b) expect(footprintRadius(a.id, places) + footprintRadius(b.id, places)).toBeLessThanOrEqual(apart(a, b) + 1e-9)
      }
    }
  })
})

/** How far a tree or building reaches across the ground, in degrees. */
const reachDeg = (x: Tree | Building) => reachOf(x) * MODEL_DEG
/** The points round a thing's edge, every 30 degrees, for checking that all of it is on land. */
const rim = (x: Tree | Building) => {
  const { up, east, south } = surfaceFrame(x.dir)
  const r = reachDeg(x) * D2R
  return Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2
    return up.clone().multiplyScalar(Math.cos(r)).addScaledVector(east.clone().multiplyScalar(Math.cos(a)).addScaledVector(south, Math.sin(a)), Math.sin(r))
  })
}
/** Where the top of a thing is, as a distance from the planet's centre. */
const topOf = (x: Tree | Building) => 1 + heightAt(x.dir, districts) + x.height * MODEL_SCALE

describe('buildings', () => {
  const buildings = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
  const inWorks = buildings.filter((b) => b.form !== 'house')
  const houses = buildings.filter((b) => b.form === 'house')

  it('are the same every visit, and differ for another seed', () => {
    const again = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
    expect(again).toEqual(buildings)
    expect(scatterBlocks(SCATTER_SEEDS.blocks + 1, districts, places)).not.toEqual(buildings)
  })

  it('stand wholly on land, clear of every landmark footprint, at least 7 degrees from a place', () => {
    expect(buildings.length).toBeGreaterThan(0)
    expect(buildings.length).toBeLessThanOrEqual(BLOCK_COUNT_MAX)
    for (const b of buildings) {
      for (const edge of [b.dir, ...rim(b)]) expect(isLand(edge, districts)).toBe(true)
      for (const p of places) {
        const apart = angleDeg(b.dir, dirOf(p.at))
        expect(apart).toBeGreaterThanOrEqual(BLOCK_CLEAR)
        expect(apart).toBeGreaterThanOrEqual(footprintRadius(p.id, places) * MODEL_DEG + reachDeg(b))
      }
    }
  })

  it('fill The Works loosely round a 3.3 degree grid of blocks and towers, square to it but not in file', () => {
    expect(inWorks.length).toBeGreaterThan(20)
    const offsets: number[] = []
    for (const b of inWorks) {
      expect(offCityGrid(b.dir, 0, districts)).toBe(false)
      // Near a grid cell, but nudged off it: a whole number of 3.3 degree steps of latitude from the centre, give or take.
      const steps = (latLonOf(b.dir).lat - works.center.lat) / GRID.step
      const off = steps - Math.round(steps)
      expect(Math.abs(off)).toBeLessThanOrEqual(GRID.jitter + 1e-9)
      offsets.push(off)
      expect([0, Math.PI / 2]).toContain(b.yaw)
    }
    // Not a regiment: the nudges spread.
    const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length
    const spread = Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length)
    expect(spread).toBeGreaterThan(0.08)
    expect(new Set(inWorks.map((b) => b.form))).toEqual(new Set(['block', 'tower']))
  })

  it('thin out where they crowd: no city building has more than four others close round it', () => {
    for (const a of inWorks) {
      const close = inWorks.filter((b) => b !== a && angleDeg(a.dir, b.dir) < CITY_CROWD.within)
      expect(close.length).toBeLessThanOrEqual(CITY_CROWD.most)
    }
  })

  it('vary their heights and footprints', () => {
    expect(new Set(inWorks.map((b) => b.storeys)).size).toBeGreaterThanOrEqual(3)
    const widths = inWorks.map((b) => b.width)
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(0.08)
  })

  it('never hide any part of a landmark from its place’s camera, losing storeys or the building itself to keep the view', () => {
    for (const b of buildings) expect(blocksView(b.dir, reachDeg(b), b.height, places, districts), `${latLonOf(b.dir).lat.toFixed(1)},${latLonOf(b.dir).lon.toFixed(1)}`).toBe(false)
    // The check itself: a tall building straight between a place's camera and its landmark is caught.
    const beacon = places.find((p) => p.id === 'beacon')!
    const between = dirOf({ lat: beacon.at.lat - 5, lon: beacon.at.lon })
    expect(blocksView(between, 1, 3, places, districts)).toBe(true)
  })

  it('count a building that clips only a landmark’s side as hiding it', () => {
    const beacon = places.find((p) => p.id === 'beacon')!
    const up = dirOf(beacon.at)
    const { east } = surfaceFrame(up)
    const ground = up.clone().multiplyScalar(1 + heightAt(up, districts))
    const eye = placeGoal(beacon, districts).position
    // A point on the landmark's east side, half way up, at the edge of its allowed footprint.
    const side = ground
      .clone()
      .addScaledVector(up, 0.5 * beacon.height * MODEL_SCALE)
      .addScaledVector(east, footprintRadius(beacon.id, places) * MODEL_SCALE)
    // A slim building on the sight line to that point, well off the line to the landmark's middle.
    const on = eye.clone().lerp(side, 0.7)
    const dir = on.clone().normalize()
    const height = (on.length() - 1 - heightAt(dir, districts)) / MODEL_SCALE + 0.2
    // 0.6 degrees across: slimmer than any real building, and about 4 degrees off the line to the landmark's middle there.
    expect(angleDeg(dir, eye.clone().lerp(ground.clone().addScaledVector(up, 0.5 * beacon.height * MODEL_SCALE), 0.7).normalize())).toBeGreaterThan(3)
    expect(blocksView(dir, 0.6, height, places, districts)).toBe(true)
  })

  it('have walls a step darker than any landmark’s, and flat roofs darker than their walls, varied between neighbours', () => {
    const landmarkWalls = districts.map((d) => luminance(blend(d.color, landmark.cream, 0.45)))
    for (const w of scatter.walls) expect(luminance(w), w).toBeLessThanOrEqual(Math.min(...landmarkWalls) * 0.85)
    for (const b of inWorks) {
      expect(scatter.roofs).toContain(b.roof)
      expect(luminance(b.roof)).toBeLessThan(luminance(b.wall) * 0.8)
    }
    // Next door rarely has the same roof.
    let same = 0
    for (const a of inWorks) {
      const nearest = inWorks.filter((b) => b !== a).reduce((m, b) => (angleDeg(a.dir, b.dir) < angleDeg(a.dir, m.dir) ? b : m))
      if (nearest.roof === a.roof) same++
    }
    expect(same / inWorks.length).toBeLessThan(0.2)
    expect(new Set(inWorks.map((b) => b.roof)).size).toBeGreaterThanOrEqual(4)
  })

  it('carry a small rooftop detail, varied: a water tank, a stair hut, a skylight or nothing, never in the middle', () => {
    const kinds = new Set(inWorks.map((b) => b.rooftop))
    expect(kinds).toEqual(new Set(['tank', 'hut', 'skylight', 'none']))
    for (const b of inWorks) {
      expect(Math.max(Math.abs(b.rooftopAt[0]), Math.abs(b.rooftopAt[1]))).toBeGreaterThanOrEqual(0.35)
      expect(Math.max(Math.abs(b.rooftopAt[0]), Math.abs(b.rooftopAt[1]))).toBeLessThanOrEqual(1)
    }
  })

  it('light their windows at night more dimly than a landmark does', () => {
    expect(luminance(scatter.windowLit)).toBeLessThan(luminance(landmark.lit) * 0.8)
  })

  it('are small houses with pitched roofs outside The Works, no two of them overlapping', () => {
    expect(houses.length).toBeGreaterThan(4)
    for (const h of houses) {
      expect(angleDeg(h.dir, dirOf(works.center))).toBeGreaterThan(works.radius)
      expect(h.storeys).toBeLessThanOrEqual(2)
    }
    // Houses go where they please, so no two may come within reach of each other, nor of a city building.
    for (const a of houses) {
      for (const b of buildings) {
        if (a !== b) expect(angleDeg(a.dir, b.dir)).toBeGreaterThan(reachDeg(a) + reachDeg(b))
      }
    }
  })

  it('never stand inside one another: every pair of footprints, parapets and eaves included, keeps a street apart, for this seed and others', () => {
    for (const seed of SEEDS) {
      const all = scatterBlocks(seed, districts, places)
      let near = 0
      for (const [i, a] of all.entries()) {
        for (const b of all.slice(i + 1)) {
          if (angleDeg(a.dir, b.dir) > 6) continue
          near++
          expect(footprintGap(a, b), `seed ${seed}: ${where(a)} and ${where(b)}`).toBeGreaterThanOrEqual(STREET - 1e-6)
        }
      }
      // Close neighbours were checked, not none.
      expect(near).toBeGreaterThan(20)
    }
  })

  it('come in two or three sizes and forms, well below the tall landmarks, in the muted palette', () => {
    const heights = buildings.map((b) => b.height)
    expect(Math.max(...heights)).toBeGreaterThan(1.3)
    expect(Math.min(...heights)).toBeLessThan(0.9)
    const tallest = Math.max(...places.map((p) => p.height))
    for (const b of buildings) {
      expect(b.height).toBeLessThan(tallest * 0.8)
      expect(b.storeys).toBeGreaterThanOrEqual(1)
      expect(scatter.walls).toContain(b.wall)
      expect(scatter.trim).toContain(b.trim)
      expect([...scatter.trim, ...scatter.roofs]).toContain(b.roof)
    }
  })

  it('pass under every route, which may cost a building a storey', () => {
    for (const b of buildings) expect(topOf(b)).toBeLessThan(routeCeiling(b.dir, reachDeg(b), districts) - ROUTE_HEADROOM + 1e-9)
    expect(buildingHeight('block', 3)).toBeGreaterThan(buildingHeight('block', 2))
  })
})

describe('trees', () => {
  const buildings = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
  const trees = scatterTrees(SCATTER_SEEDS.trees, districts, places, buildings)

  it('are planted the same every visit, and differently for another seed', () => {
    expect(trees).toHaveLength(TREE_COUNT)
    expect(scatterTrees(SCATTER_SEEDS.trees, districts, places, buildings)).toEqual(trees)
    expect(scatterTrees(SCATTER_SEEDS.trees + 1, districts, places, buildings)[17].dir.toArray()).not.toEqual(trees[17].dir.toArray())
  })

  it('stand wholly on land, clear of every landmark footprint, at least 7.5 degrees from a place', () => {
    for (const x of trees) {
      for (const edge of [x.dir, ...rim(x)]) expect(isLand(edge, districts)).toBe(true)
      for (const p of places) {
        const apart = angleDeg(x.dir, dirOf(p.at))
        expect(apart).toBeGreaterThanOrEqual(TREE_CLEAR.place)
        expect(apart).toBeGreaterThanOrEqual(footprintRadius(p.id, places) * MODEL_DEG + reachDeg(x))
      }
    }
  })

  it('keep off the whole city grid, its far corner cells included', () => {
    const cells = gridCells(districts)
    const corner = cells[0]
    // A corner cell is further from the centre than the city's 17 degree circle, so the circle alone would not keep it clear.
    expect(cells).toHaveLength((2 * GRID.reach + 1) ** 2)
    expect(angleDeg(corner, dirOf(works.center))).toBeGreaterThan(TREE_CLEAR.city)
    for (const x of trees) {
      expect(angleDeg(x.dir, dirOf(works.center))).toBeGreaterThan(TREE_CLEAR.city)
      for (const c of cells) expect(angleDeg(x.dir, c)).toBeGreaterThan(GRID.step / 2 + reachDeg(x))
    }
    // And the check itself: the corner cell is on the grid.
    expect(offCityGrid(corner, 0, districts)).toBe(false)
  })

  it('stand clear of every building’s footprint, for this seed and others', () => {
    for (const seed of SEEDS) {
      const bs = scatterBlocks(seed, districts, places)
      const ts = scatterTrees(seed + 101, districts, places, bs)
      for (const t of ts) {
        for (const b of bs) {
          if (angleDeg(t.dir, b.dir) > 6) continue
          // The canopy is a circle of its reach; the building its footprint rectangle.
          expect(circleToFootprint(t.dir, reachOf(t), b), `seed ${seed}: tree at ${where(t)}, building at ${where(b)}`).toBeGreaterThanOrEqual(-1e-6)
        }
      }
    }
  })

  it('stand clear of every building and inside no other tree', () => {
    for (const x of trees) {
      for (const b of buildings) expect(angleDeg(x.dir, b.dir)).toBeGreaterThanOrEqual(reachDeg(x) + reachDeg(b))
      for (const y of trees) {
        // Canopies may touch, but each tree's middle is outside the other's canopy.
        if (x !== y) expect(angleDeg(x.dir, y.dir)).toBeGreaterThan(Math.max(reachDeg(x), reachDeg(y)))
      }
    }
  })

  it('pass under every route', () => {
    for (const x of trees) expect(topOf(x)).toBeLessThan(routeCeiling(x.dir, reachDeg(x), districts) - ROUTE_HEADROOM + 1e-9)
  })

  it('grow in groves of the three forms, in the shares the layout asks for', () => {
    const forms = new Map<string, number>()
    for (const x of trees) forms.set(x.form, (forms.get(x.form) ?? 0) + 1)
    for (const [form, share] of FORM_SHARE) expect(Math.abs((forms.get(form) ?? 0) / trees.length - share), form).toBeLessThanOrEqual(0.05)
    // In groves: most trees have a neighbour within a few of their own widths.
    const near = trees.filter((x) => trees.some((y) => y !== x && angleDeg(x.dir, y.dir) < 3 * (reachDeg(x) + reachDeg(y))))
    expect(near.length).toBeGreaterThan(TREE_COUNT * 0.7)
  })

  it('are mostly green, with blossom only round The Studio and Home and autumn only in After Hours', () => {
    const whose = (x: Tree) => landValue(x.dir, districts).district
    for (const x of trees) {
      if (x.form === 'conifer') expect(scatter.conifer).toContain(x.color)
      else expect([...scatter.leaf, ...scatter.blossom, ...scatter.autumn]).toContain(x.color)
      if ((scatter.blossom as readonly string[]).includes(x.color)) expect(['studio', 'home']).toContain(whose(x))
      if ((scatter.autumn as readonly string[]).includes(x.color)) expect(whose(x)).toBe('hours')
    }
    const blossom = trees.filter((x) => (scatter.blossom as readonly string[]).includes(x.color))
    expect(blossom.length).toBeGreaterThan(0)
    expect(blossom.length).toBeLessThan(trees.length * 0.25)
    // Neighbours vary: not every tree takes the same green.
    expect(new Set(trees.map((x) => x.color)).size).toBeGreaterThan(5)
  })

  it('stand on a short trunk, each within its form', () => {
    for (const x of trees) {
      const spec = TREE_FORMS[x.form]
      expect(x.radius).toBeGreaterThanOrEqual(spec.radius[0])
      expect(x.radius).toBeLessThanOrEqual(spec.radius[1])
      expect(x.trunk).toBeGreaterThan(0)
      expect(x.trunk).toBeLessThan(x.height * 0.4)
      expect(x.height).toBeGreaterThan(1.5 * x.radius)
    }
  })
})

describe('routes', () => {
  const r = routes(districts)

  it('are six arcs that clear the ground and never rise past the sky above it', () => {
    expect(r).toHaveLength(6)
    expect(ROUTE_ARCS).toHaveLength(6)
    for (const x of r) {
      for (let t = 0; t <= 1; t += 0.1) {
        const len = x.at(t).length()
        expect(len).toBeGreaterThanOrEqual(1.09)
        expect(len).toBeLessThanOrEqual(1.22 + 1e-9)
      }
    }
  })

  it('leave one island for another, each pair once', () => {
    const pairs = r.map((x) => [x.from, x.to].sort().join('-'))
    expect(new Set(pairs).size).toBe(6)
    for (const x of r) expect(x.from).not.toBe(x.to)
  })

  it('run from above the island they leave to above the one they reach', () => {
    for (const x of r) {
      const a = districts.find((d) => d.id === x.from)!
      const b = districts.find((d) => d.id === x.to)!
      expect(angleDeg(x.at(0).normalize(), dirOf(a.center))).toBeLessThan(angleDeg(x.at(1).normalize(), dirOf(a.center)))
      expect(angleDeg(x.at(1).normalize(), dirOf(b.center))).toBeLessThan(angleDeg(x.at(0).normalize(), dirOf(b.center)))
    }
  })
})

describe('the paddleboarder', () => {
  it('stays on the water around Home, upright, with the board along her path', () => {
    for (let t = 0; t < 60; t += 5) {
      const p = paddlePath(home, t)
      expect(isLand(p.position.clone().normalize(), districts)).toBe(false)
      expect(p.forward.dot(p.up)).toBeCloseTo(0)
      expect(p.forward.length()).toBeCloseTo(1)
      expect(p.up.length()).toBeCloseTo(1)
      expect(p.up.dot(p.position.clone().normalize())).toBeCloseTo(1)
    }
  })

  it('goes all the way round, and keeps to the water the whole way', () => {
    // A full circle at the path's pace, in finer steps than the brief's.
    for (let t = 0; t < 60; t += 0.5) {
      expect(isLand(paddlePath(home, t).position.clone().normalize(), districts), `t=${t}`).toBe(false)
    }
    const start = paddlePath(home, 0).position
    const quarter = paddlePath(home, 15).position
    expect(start.distanceTo(quarter)).toBeGreaterThan(0.1)
  })

  it('floats at the sea surface, bobbing a little', () => {
    const radii = Array.from({ length: 60 }, (_, i) => paddlePath(home, i * 0.25).position.length())
    expect(Math.min(...radii)).toBeGreaterThan(0.999)
    expect(Math.max(...radii)).toBeLessThan(1.004)
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.001)
  })
})
