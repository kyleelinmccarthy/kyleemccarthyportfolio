import { describe, it, expect, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { batchStatic } from '@/components/world/models/kit'
import { landmark } from '@/content/sky'
import { districts } from '@/content/world'
import {
  BEVEL,
  FOOTPRINT,
  GLASS,
  LINE,
  PAINT,
  lineWidth,
  SHADOW,
  chamferedBox,
  glassNight,
  paintColour,
  paneCoords,
  shadowDisc,
  shadowFalloff,
  shadowStrength,
  OUTLINE,
  SharedCache,
  blend,
  geometryKey,
  outlineScale,
  prismCorners,
  revolve,
  roofCorners,
  roofCourses,
  roundSides,
  roundedHull,
  roundedRectOutline,
  softProfile,
  spinAngle,
  starOutline,
  wave,
  withinFootprint,
  type Point2,
  type Vec3,
} from '@/lib/world/kit'

const EPS = 1e-6

/** Every triangle of an indexed or flat position list, with the normals at its corners. */
function triangles(mesh: { positions: Float32Array; normals: Float32Array; index?: Uint32Array }) {
  const at = (i: number, arr: Float32Array) => new Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
  const count = mesh.index ? mesh.index.length : mesh.positions.length / 3
  const out: Array<{ p: Vector3[]; n: Vector3[] }> = []
  for (let t = 0; t < count; t += 3) {
    const ids = [0, 1, 2].map((k) => (mesh.index ? mesh.index[t + k] : t + k))
    out.push({ p: ids.map((i) => at(i, mesh.positions)), n: ids.map((i) => at(i, mesh.normals)) })
  }
  return out
}

/** True when every non-degenerate triangle winds counter-clockwise seen from outside, as its normals say. */
function facesOutward(mesh: { positions: Float32Array; normals: Float32Array; index?: Uint32Array }): boolean {
  return triangles(mesh).every(({ p, n }) => {
    const face = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]))
    if (face.length() < 1e-9) return true
    const avg = n[0].clone().add(n[1]).add(n[2])
    return face.dot(avg) > 0
  })
}

function bounds(positions: Float32Array) {
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < positions.length; i += 3) {
    const v = new Vector3(positions[i], positions[i + 1], positions[i + 2])
    min.min(v)
    max.max(v)
  }
  return { min, max }
}

describe('outlines', () => {
  it('keeps outlines thin whatever the part size', () => {
    expect(outlineScale(1)).toBeCloseTo(1.014)
    expect(outlineScale(0.1)).toBeCloseTo(1.14)
    expect(outlineScale(1, 0.5)).toBeCloseTo(1.02)
  })

  it('never returns an unusable scale for a degenerate part', () => {
    for (const r of [0, -1, NaN]) expect(Number.isFinite(outlineScale(r))).toBe(true)
    for (const r of [0, -1, NaN, Infinity]) expect(outlineScale(r)).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(outlineScale(1, NaN))).toBe(true)
    expect(outlineScale(1, -3)).toBeCloseTo(1 + OUTLINE.thickness)
  })

  it('is thin and capped, so a line never thickens into a cartoon border', () => {
    expect(OUTLINE.thickness).toBe(0.014)
    expect(OUTLINE.max).toBe(0.02)
    // A part the size of a landmark gets a line about a hundredth of its radius.
    expect(outlineScale(1.3) - 1).toBeLessThan(0.012)
  })
})

describe('lines on small parts', () => {
  it('are full width on a part at least LINE.fullAt across (by its middle extent), whatever its length or thickness', () => {
    expect(lineWidth([1, 0.5, 0.5])).toBe(OUTLINE.part)
    expect(lineWidth([LINE.fullAt, LINE.fullAt, LINE.fullAt])).toBe(OUTLINE.part)
    // A roof's tile course is thin but broad: full width.
    expect(lineWidth([1.0, 0.024, 0.13])).toBe(OUTLINE.part)
  })

  it('thin with a part’s breadth below that, to a fine line, so a knob or a rail post is not drawn as heavily as a wall', () => {
    const post = lineWidth([0.016, 0.12, 0.016])
    const knob = lineWidth([0.04, 0.04, 0.04])
    const pet = lineWidth([0.07, 0.07, 0.08])
    expect(post).toBeCloseTo(OUTLINE.part * LINE.steps.fine)
    expect(knob).toBeGreaterThanOrEqual(post)
    expect(pet).toBeGreaterThan(knob)
    expect(pet).toBeLessThan(OUTLINE.part)
    // Never below the fine line, however small.
    expect(lineWidth([0.001, 0.001, 0.001])).toBeCloseTo(OUTLINE.part * LINE.steps.fine)
  })

  it('come in three named steps only, so a landmark’s lines are at most three merged draws', () => {
    const named = Object.values(LINE.steps).map((k) => OUTLINE.part * k)
    expect(named).toHaveLength(3)
    expect(LINE.steps.full).toBe(1)
    const widths = new Set<number>()
    for (let b = 0; b <= 0.3; b += 0.001) widths.add(lineWidth([b, b, b]))
    expect(widths.size).toBe(3)
    for (const w of widths) expect(named.some((n) => Math.abs(n - w) < 1e-12)).toBe(true)
    // And never thicker as a part gets smaller.
    let last = Infinity
    for (let b = 0.3; b >= 0; b -= 0.001) {
      const w = lineWidth([b, b, b])
      expect(w).toBeLessThanOrEqual(last)
      last = w
    }
  })

  it('are full width for sizes that are not numbers, or missing', () => {
    for (const bad of [[], [NaN, NaN, NaN], [Infinity, 1, 1], [-1, -1, -1]]) {
      const w = lineWidth(bad)
      expect(Number.isFinite(w)).toBe(true)
      expect(w).toBeGreaterThanOrEqual(OUTLINE.part * LINE.steps.fine)
      expect(w).toBeLessThanOrEqual(OUTLINE.part)
    }
  })
})

describe('the footprint rule', () => {
  it('is 1.3 model units round and 2.6 tall', () => {
    expect(FOOTPRINT).toEqual({ radius: 1.3, height: 2.6 })
  })

  it('accepts a point inside it and rejects one too far out, too high or under the ground', () => {
    expect(withinFootprint(new Vector3(0.9, 2.6, -0.9))).toBe(true)
    expect(withinFootprint(new Vector3(0, 0, 1.3))).toBe(true)
    // The corner of a 2 x 2 square is 1.41 out: too far.
    expect(withinFootprint(new Vector3(1, 1, 1))).toBe(false)
    expect(withinFootprint(new Vector3(0, 2.7, 0))).toBe(false)
    expect(withinFootprint(new Vector3(0, -0.3, 0))).toBe(false)
    // An outline may stand a line's width proud of the limits.
    expect(withinFootprint(new Vector3(0, -0.01, 1.31))).toBe(true)
    expect(withinFootprint(new Vector3(0, 2.61, 0))).toBe(true)
  })
})

describe('painted surfaces', () => {
  it('are a little deeper and cooler at the ground and a little lighter toward the top', () => {
    const wall: Vec3 = [0.6, 0.5, 0.4]
    const ground = paintColour(wall, 0)
    const top = paintColour(wall, PAINT.span)
    // Deeper at the ground, and cooler: blue keeps more of itself than red.
    expect(ground[0]).toBeLessThan(wall[0])
    expect(ground[2] / wall[2]).toBeGreaterThan(ground[0] / wall[0])
    for (let i = 0; i < 3; i++) expect(top[i]).toBeGreaterThan(wall[i])
    // Subtle: under a tenth end to end.
    for (let i = 0; i < 3; i++) expect((top[i] - ground[i]) / wall[i]).toBeLessThan(0.1)
    for (let i = 0; i < 3; i++) expect((top[i] - ground[i]) / wall[i]).toBeGreaterThan(0.04)
  })

  it('never take a colour past white, so never into the bloom, and hold for any height', () => {
    for (const h of [-5, 0, 1, PAINT.span, 99, NaN]) {
      for (const c of paintColour([1, 1, 1], h)) expect(c).toBeLessThanOrEqual(1)
      for (const c of paintColour([0.2, 0.3, 0.9], h)) expect(Number.isFinite(c)).toBe(true)
    }
    // Rising steadily with height.
    const reds = [0, 0.5, 1, 1.5, 2].map((h) => paintColour([0.5, 0.5, 0.5], h)[0])
    expect([...reds].sort((a, b) => a - b)).toEqual(reds)
  })
})

describe('window glass', () => {
  it('is day glass by day, the lit glow at night, and part way at dusk', () => {
    expect(glassNight(1)).toBe(0)
    expect(glassNight(2.3)).toBe(1)
    const dusk = glassNight(1.5)
    expect(dusk).toBeGreaterThan(0.2)
    expect(dusk).toBeLessThan(0.8)
    expect(glassNight(NaN)).toBe(0)
    expect(GLASS.dayGlow).toBeLessThan(GLASS.nightGlow)
  })

  it('knows where each vertex sits across its pane, from corner to corner', () => {
    const coords = paneCoords(new Float32Array([-0.1, -0.15, 0, 0.1, 0.15, 0.02, 0, 0, 0]), [0.2, 0.3])
    expect(Array.from(coords)).toEqual([-1, -1, 1, 1, 0, 0])
    expect(Array.from(paneCoords(new Float32Array([0.5, 0.5, 0]), [0, 0]))).toEqual([0, 0])
  })
})

describe('the contact shadow', () => {
  it('is solid in the middle and fades to nothing at its edge, with no hard rim', () => {
    expect(shadowFalloff(0)).toBe(1)
    expect(shadowFalloff(SHADOW.inner)).toBe(1)
    expect(shadowFalloff(1)).toBe(0)
    expect(shadowFalloff(1.5)).toBe(0)
    expect(shadowFalloff(NaN)).toBe(0)
    // Near the edge it is already faint: no visible ring.
    expect(shadowFalloff(0.95)).toBeLessThan(0.02)
    const steps = [0.3, 0.5, 0.7, 0.9].map(shadowFalloff)
    expect([...steps].sort((a, b) => b - a)).toEqual(steps)
  })

  it('is strong in the sun and almost gone at night', () => {
    expect(shadowStrength(1)).toBe(SHADOW.day)
    expect(shadowStrength(0)).toBe(SHADOW.night)
    expect(shadowStrength(1.1)).toBe(SHADOW.day)
    expect(shadowStrength(NaN)).toBe(SHADOW.night)
    expect(SHADOW.night).toBeLessThan(0.15)
    expect(SHADOW.radius).toBeLessThanOrEqual(FOOTPRINT.radius)
  })

  it('lies on the curved ground: lifted a hair at the middle, dropping toward its edge, facing up', () => {
    const disc = shadowDisc(1, 4, 11.4)
    const ys = (i: number) => disc.positions[i * 3 + 1]
    const centre = 2 * 5 + 2
    expect(ys(centre)).toBeCloseTo(SHADOW.lift)
    // The middle of an edge has dropped by r²/2R.
    expect(ys(2)).toBeCloseTo(SHADOW.lift - 1 / (2 * 11.4))
    for (let t = 0; t < disc.index.length; t += 3) {
      const p = [0, 1, 2].map((k) => new Vector3().fromArray(disc.positions, disc.index[t + k] * 3))
      const n = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]))
      expect(n.y).toBeGreaterThan(0)
    }
    for (const u of disc.uvs) {
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
    }
  })
})

describe('round parts', () => {
  it('get more sides the bigger they are, within sensible bounds', () => {
    expect(roundSides(0.07)).toBeGreaterThanOrEqual(12)
    expect(roundSides(0.07)).toBeLessThan(roundSides(0.2))
    expect(roundSides(0.2)).toBeLessThan(roundSides(0.6))
    expect(roundSides(5)).toBe(40)
    for (const r of [0, -1, NaN]) expect(roundSides(r)).toBe(12)
  })
})

describe('the geometry cache', () => {
  it('keys identical parts alike, ignoring float noise, and different parts apart', () => {
    expect(geometryKey('block', [1, 0.5, 0.25], 0.04)).toBe(geometryKey('block', [1, 0.5, 0.25], 0.04))
    expect(geometryKey('block', [0.1 + 0.2, 1, 1])).toBe(geometryKey('block', [0.3, 1, 1]))
    expect(geometryKey('block', [-0, 1, 1])).toBe(geometryKey('block', [0, 1, 1]))
    expect(geometryKey('block', [1, 1, 1])).not.toBe(geometryKey('block', [1, 1, 1.01]))
    expect(geometryKey('block', [1, 1, 1])).not.toBe(geometryKey('tube', [1, 1, 1]))
    expect(geometryKey('roof', 'gable', 1)).not.toBe(geometryKey('roof', 'hip', 1))
    // Grouping matters: [1, 2], 3 is not [1], 2, 3.
    expect(geometryKey('x', [1, 2], 3)).not.toBe(geometryKey('x', [1], 2, 3))
  })

  /** A cache whose deferred work runs only when the test says: `soon` after the current task, `later` after a long wait. */
  function cacheWithClock() {
    const freed = vi.fn()
    const soon: Array<() => void> = []
    const later: Array<() => void> = []
    const cache = new SharedCache<{ id: number }>(freed, (f) => soon.push(f), (f) => later.push(f))
    const run = (queue: Array<() => void>) => queue.splice(0).forEach((f) => f())
    return { cache, freed, runSoon: () => run(soon), runLater: () => run(later) }
  }

  it('shares one value between users and frees it once the last has let go', () => {
    const { cache, freed, runSoon } = cacheWithClock()
    let built = 0
    const build = () => ({ id: ++built })
    const a = cache.peek('k', build)
    const b = cache.peek('k', build)
    expect(a).toBe(b)
    expect(built).toBe(1)
    cache.hold('k', a)
    cache.hold('k', b)
    cache.release('k', a)
    cache.release('k', b)
    // Not straight away: another user may take it up in the same commit.
    expect(freed).not.toHaveBeenCalled()
    runSoon()
    expect(freed).toHaveBeenCalledWith(a)
    expect(cache.size).toBe(0)
    // Asked again, it builds a fresh one.
    expect(cache.peek('k', build).id).toBe(2)
  })

  it('survives a mount, unmount and remount of the same user (React strict mode) without freeing it', () => {
    const { cache, freed, runSoon } = cacheWithClock()
    const a = cache.peek('k', () => ({ id: 1 }))
    cache.hold('k', a)
    cache.release('k', a)
    cache.hold('k', a)
    runSoon()
    expect(freed).not.toHaveBeenCalled()
    // Still the one in use, so a second user shares it rather than building another.
    expect(cache.peek('k', () => ({ id: 2 }))).toBe(a)
    cache.release('k', a)
    runSoon()
    expect(freed).toHaveBeenCalledTimes(1)
    expect(cache.size).toBe(0)
  })

  it('keeps a value for a user that mounts in the same commit as the last one unmounts', () => {
    const { cache, freed, runSoon } = cacheWithClock()
    const a = cache.peek('k', () => ({ id: 1 }))
    cache.hold('k', a)
    // B renders and peeks A's value; A unmounts; B mounts.
    const b = cache.peek('k', () => ({ id: 2 }))
    expect(b).toBe(a)
    cache.release('k', a)
    cache.hold('k', b)
    runSoon()
    expect(freed).not.toHaveBeenCalled()
    expect(cache.peek('k', () => ({ id: 3 }))).toBe(a)
  })

  it('frees a value whose render never committed, after a while', () => {
    const { cache, freed, runSoon, runLater } = cacheWithClock()
    const a = cache.peek('k', () => ({ id: 1 }))
    runSoon()
    expect(freed).not.toHaveBeenCalled()
    runLater()
    expect(freed).toHaveBeenCalledWith(a)
    expect(cache.size).toBe(0)
  })

  it('does not free an orphan that was taken up before the wait ran out', () => {
    const { cache, freed, runLater } = cacheWithClock()
    const a = cache.peek('k', () => ({ id: 1 }))
    cache.hold('k', a)
    runLater()
    expect(freed).not.toHaveBeenCalled()
  })

  it('defers with the real queueMicrotask without breaking it (a browser throws when it is called as a method)', async () => {
    const original = globalThis.queueMicrotask
    // As a browser does: "Illegal invocation" unless called plainly.
    globalThis.queueMicrotask = function (this: unknown, task: VoidFunction) {
      if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation')
      original(task)
    }
    try {
      const freed = vi.fn()
      const cache = new SharedCache<{ id: number }>(freed)
      const a = cache.peek('k', () => ({ id: 1 }))
      cache.hold('k', a)
      expect(() => cache.release('k', a)).not.toThrow()
      await new Promise<void>((resolve) => original(resolve))
      expect(freed).toHaveBeenCalledWith(a)
    } finally {
      globalThis.queueMicrotask = original
    }
  })

  it('never frees a newer value that took over the key', () => {
    const { cache, freed, runSoon } = cacheWithClock()
    const old = cache.peek('k', () => ({ id: 1 }))
    cache.hold('k', old)
    cache.release('k', old)
    runSoon()
    const fresh = cache.peek('k', () => ({ id: 2 }))
    cache.hold('k', fresh)
    // A late release of the old value (already freed) leaves the fresh one alone.
    cache.release('k', old)
    runSoon()
    expect(cache.peek('k', () => ({ id: 3 }))).toBe(fresh)
    expect(freed).toHaveBeenCalledTimes(1)
  })
})

describe('soft profiles', () => {
  const unit = (n: Point2) => Math.hypot(n[0], n[1])

  it('rounds every corner of a cylinder and keeps its straight runs flat', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.5, 1], [0, 1]], 0.05)
    expect(p.points[0]).toEqual([0, 0])
    expect(p.points.at(-1)).toEqual([0, 1])
    // The sharp corners are gone.
    for (const [x, y] of p.points) expect(Math.abs(x - 0.5) < EPS && (Math.abs(y) < EPS || Math.abs(y - 1) < EPS)).toBe(false)
    for (const n of p.normals) expect(unit(n)).toBeCloseTo(1)
    // The wall's normals point straight out, the bottom's straight down, the top's straight up.
    p.points.forEach(([x, y], i) => {
      if (Math.abs(x - 0.5) < EPS) expect(p.normals[i][0]).toBeCloseTo(1)
      if (Math.abs(y) < EPS) expect(p.normals[i][1]).toBeCloseTo(-1)
      if (Math.abs(y - 1) < EPS) expect(p.normals[i][1]).toBeCloseTo(1)
    })
    // It stays inside the shape it softens.
    for (const [x, y] of p.points) {
      expect(x).toBeGreaterThanOrEqual(-EPS)
      expect(x).toBeLessThanOrEqual(0.5 + EPS)
      expect(y).toBeGreaterThanOrEqual(-EPS)
      expect(y).toBeLessThanOrEqual(1 + EPS)
    }
  })

  it('marks only the rounded corners as bevel, for the edge highlight', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.5, 1], [0, 1]], 0.05)
    expect(p.bevel).toHaveLength(p.points.length)
    p.points.forEach(([x, y], i) => {
      const flat = Math.abs(x - 0.5) < EPS || Math.abs(y) < EPS || Math.abs(y - 1) < EPS
      if (p.bevel[i] > 0) expect(flat).toBe(false)
    })
    expect(p.bevel.filter((b) => b > 0).length).toBeGreaterThanOrEqual(4)
  })

  it('rounds the tip of a cone where it meets the axis', () => {
    const p = softProfile([[0, 0], [0.4, 0], [0, 1]], 0.05)
    const tip = p.points.at(-1)!
    expect(tip[0]).toBeCloseTo(0)
    expect(tip[1]).toBeLessThan(1)
    expect(tip[1]).toBeGreaterThan(0.85)
    expect(p.normals.at(-1)![1]).toBeCloseTo(1)
    for (const n of p.normals) expect(unit(n)).toBeCloseTo(1)
  })

  it('turns normals the right way round a concave corner, as in the neck of a vase', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.5, 0.4], [0.2, 0.6], [0.2, 1], [0, 1]], 0.04)
    // At the neck the surface faces up and out, never into the solid.
    p.points.forEach(([x, y], i) => {
      if (y > 0.55 && y < 0.65 && x > 0.19 && x < 0.3) expect(p.normals[i][0]).toBeGreaterThan(0)
    })
    for (const n of p.normals) expect(unit(n)).toBeCloseTo(1)
  })

  it('keeps a big radius from overrunning a short segment', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.5, 0.05], [0, 0.05]], 0.2)
    for (const [x, y] of p.points) {
      expect(y).toBeGreaterThanOrEqual(-EPS)
      expect(y).toBeLessThanOrEqual(0.05 + EPS)
      expect(x).toBeLessThanOrEqual(0.5 + EPS)
    }
    for (const n of p.normals) expect(unit(n)).toBeCloseTo(1)
  })

  it('copes with a repeated point, as a tube with no top gives it', () => {
    const p = softProfile([[0, 0], [0.4, 0], [0, 1], [0, 1]], 0.05)
    for (const n of p.normals) expect(unit(n)).toBeCloseTo(1)
    expect(p.points.at(-1)![0]).toBeCloseTo(0)
  })

  it('leaves a radius of zero sharp: each hard corner twice, once with each side’s normal', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.5, 1], [0, 1]], 0)
    expect(p.points).toEqual([[0, 0], [0.5, 0], [0.5, 0], [0.5, 1], [0.5, 1], [0, 1]])
    const expected = [[0, -1], [0, -1], [1, 0], [1, 0], [0, 1], [0, 1]]
    p.normals.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(expected[i][0])
      expect(y).toBeCloseTo(expected[i][1])
    })
  })
})

describe('revolve', () => {
  it('turns a profile into a closed solid whose faces look outward', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.3, 1], [0, 1]], 0.05)
    const mesh = revolve(p, 16)
    expect(mesh.positions.length / 3).toBe(17 * p.points.length)
    expect(mesh.normals.length).toBe(mesh.positions.length)
    expect(mesh.bevel.length).toBe(mesh.positions.length / 3)
    expect(facesOutward(mesh)).toBe(true)
    const { min, max } = bounds(mesh.positions)
    expect(max.y).toBeCloseTo(1)
    expect(min.y).toBeCloseTo(0)
    // The bottom rim is rounded, so it comes just inside the sharp corner's 0.5.
    expect(max.x).toBeLessThanOrEqual(0.5)
    expect(max.x).toBeGreaterThan(0.48)
    expect(max.z).toBeCloseTo(max.x, 5)
  })
})

describe('chamfered boxes', () => {
  it('are exactly their size, with every edge chamfered and every face looking outward', () => {
    const box = chamferedBox([1, 0.5, 0.25], 0.04)
    const { min, max } = bounds(box.positions)
    expect(min.toArray().map((v) => +v.toFixed(6))).toEqual([-0.5, -0.25, -0.125])
    expect(max.toArray().map((v) => +v.toFixed(6))).toEqual([0.5, 0.25, 0.125])
    expect(facesOutward(box)).toBe(true)
    // Six faces of two triangles, twelve edges of two, eight corners of one: lean enough for nineteen landmarks.
    expect(box.index!.length / 3).toBe(44)
    for (const { n } of triangles(box)) for (const v of n) expect(v.length()).toBeCloseTo(1)
  })

  it('shade the faces flat and mark only the chamfers as bevel', () => {
    const box = chamferedBox([1, 1, 1], 0.05)
    const flat = triangles({ ...box, index: box.index!.slice(0, 36) })
    for (const { n } of flat) expect(n.every((v) => v.equals(n[0]))).toBe(true)
    const bevelled = Array.from(box.index!.slice(36)).every((i) => box.bevel[i] === 1)
    expect(bevelled).toBe(true)
    expect(Array.from(box.index!.slice(0, 36)).every((i) => box.bevel[i] === 0)).toBe(true)
  })

  it('never lets the chamfer pass the middle of a thin side', () => {
    const box = chamferedBox([1, 0.02, 1], 0.04)
    const { min, max } = bounds(box.positions)
    expect(max.y - min.y).toBeCloseTo(0.02)
    for (const { n } of triangles(box)) for (const v of n) expect(Number.isFinite(v.x)).toBe(true)
  })
})

describe('rounded hulls', () => {
  it('build a gable roof exactly to size, ridge running left to right, faces outward', () => {
    const corners = roofCorners('gable', [1, 0.5, 0.8], 0.1, 0.03)
    const mesh = roundedHull(corners, 0.03)
    const { min, max } = bounds(mesh.positions)
    expect(min.x).toBeCloseTo(-0.6, 5)
    expect(max.x).toBeCloseTo(0.6, 5)
    expect(min.z).toBeCloseTo(-0.5, 5)
    expect(max.z).toBeCloseTo(0.5, 5)
    expect(min.y).toBeCloseTo(0, 5)
    expect(max.y).toBeCloseTo(0.5, 5)
    expect(facesOutward(mesh)).toBe(true)
    // The ridge spans the width: there is roof at full height near both gable ends.
    const top: Vector3[] = []
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (mesh.positions[i + 1] > 0.5 - 1e-4) top.push(new Vector3(mesh.positions[i], 0, mesh.positions[i + 2]))
    }
    expect(Math.max(...top.map((v) => v.x)) - Math.min(...top.map((v) => v.x))).toBeGreaterThan(1)
    for (const v of top) expect(Math.abs(v.z)).toBeLessThan(0.05)
  })

  it('give smooth unit normals, flat on the faces, with the bevel marked only on the edges', () => {
    const mesh = roundedHull(roofCorners('hip', [1, 0.5, 0.8], 0.1, 0.03), 0.03)
    for (const { n } of triangles(mesh)) for (const v of n) expect(v.length()).toBeCloseTo(1)
    // The underside is one flat face: every vertex on it faces straight down and is not bevel.
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      if (mesh.positions[i * 3 + 1] < 1e-6) {
        expect(mesh.normals[i * 3 + 1]).toBeCloseTo(-1)
        expect(mesh.bevel[i]).toBe(0)
      }
    }
    expect(Array.from(mesh.bevel).some((b) => b > 0)).toBe(true)
  })

  it('build a hipped roof that comes to a point over a square, and a lean-to that rises to the back', () => {
    const pyramid = roofCorners('hip', [1, 0.6, 1], 0, 0)
    const apex = pyramid.filter((c) => c.y > 0.6 - 1e-9)
    expect(apex).toHaveLength(1)
    const shed = roofCorners('shed', [1, 0.6, 1], 0, 0.05)
    const high = shed.filter((c) => c.y > 0.6 - 1e-9)
    expect(high.length).toBeGreaterThan(0)
    for (const c of high) expect(c.z).toBeLessThan(0)
  })

  it('lay tile courses up both slopes of a gable, on the roof and turned to its pitch', () => {
    const size: Vec3 = [1, 0.5, 0.8]
    const courses = roofCourses('gable', size, 0.1, 0.05, 4)
    expect(courses).toHaveLength(8)
    // The front slope runs from the eave (z 0.5, y 0.05) to the ridge (z 0, y 0.5).
    const pitch = Math.atan2(0.45, 0.5)
    const front = courses.filter((c) => c.at[2] > 0)
    expect(front).toHaveLength(4)
    for (const c of courses) {
      const z = Math.abs(c.at[2])
      // The roof surface at this distance from the ridge, and the slat sits just above it.
      const surface = 0.05 + 0.45 * (1 - z / 0.5)
      expect(c.at[1]).toBeGreaterThan(surface)
      expect(c.at[1]).toBeLessThan(surface + 0.05)
      // Turned close to the pitch, a little shallower so the lower lip stands proud.
      expect(Math.abs(c.rot[0])).toBeLessThan(pitch)
      expect(Math.abs(c.rot[0])).toBeGreaterThan(pitch - 0.1)
      expect(Math.sign(c.rot[0])).toBe(Math.sign(c.at[2]))
      // As wide as the roof and a little past its gables.
      expect(c.size[0]).toBeGreaterThan(1.2)
      expect(c.size[0]).toBeLessThan(1.26)
    }
    // Climbing from the eave to the ridge.
    expect(front.map((c) => c.at[1])).toEqual([...front.map((c) => c.at[1])].sort((a, b) => a - b))
  })

  it('lay one run of courses on a lean-to, rising to the back, and none on a hipped roof', () => {
    const shed = roofCourses('shed', [1, 0.4, 0.6], 0, 0.04, 3)
    expect(shed).toHaveLength(3)
    expect(shed[2].at[1]).toBeGreaterThan(shed[0].at[1])
    expect(shed[2].at[2]).toBeLessThan(shed[0].at[2])
    expect(roofCourses('hip', [1, 0.4, 0.6], 0, 0.04, 3)).toEqual([])
    expect(roofCourses('gable', [1, 0.4, 0.6], 0, 0.04, 0)).toEqual([])
  })

  it('stand a faceted prism on the ground with a flat face to the front', () => {
    const corners = prismCorners(0.4, 0.4, 1, 6)
    const mesh = roundedHull(corners, 0.02)
    const { min, max } = bounds(mesh.positions)
    expect(min.y).toBeCloseTo(0, 5)
    expect(max.y).toBeCloseTo(1, 5)
    expect(facesOutward(mesh)).toBe(true)
    // Some face looks straight at the front (+Z).
    const front = triangles(mesh).some(({ n }) => n.every((v) => v.z > 1 - 1e-6))
    expect(front).toBe(true)
  })
})

describe('outlines for shaped plates', () => {
  it('draws a star with alternating points', () => {
    const star = starOutline(5, 0.5, 0.2)
    expect(star).toHaveLength(10)
    star.forEach(([x, y], i) => expect(Math.hypot(x, y)).toBeCloseTo(i % 2 === 0 ? 0.5 : 0.2))
    // The first point is straight up.
    expect(star[0][0]).toBeCloseTo(0)
    expect(star[0][1]).toBeCloseTo(0.5)
  })

  it('draws a rounded rectangle inside its size', () => {
    const rect = roundedRectOutline(1, 0.5, 0.1)
    for (const [x, y] of rect) {
      expect(Math.abs(x)).toBeLessThanOrEqual(0.5 + EPS)
      expect(Math.abs(y)).toBeLessThanOrEqual(0.25 + EPS)
    }
    // No point sits on a sharp corner.
    for (const [x, y] of rect) expect(Math.abs(x) > 0.5 - EPS && Math.abs(y) > 0.25 - EPS).toBe(false)
    expect(rect.length).toBeGreaterThan(8)
  })
})

describe('colour', () => {
  it('blends two palette colours, ending exactly on each', () => {
    expect(blend('#FF0000', '#0000FF', 0)).toBe('#ff0000')
    expect(blend('#FF0000', '#0000FF', 1)).toBe('#0000ff')
    const mid = blend(districts[0].color, landmark.cream, 0.5)
    expect(mid).toMatch(/^#[0-9a-f]{6}$/)
    expect(mid).not.toBe(districts[0].color.toLowerCase())
  })

  it('offers a full, considered landmark palette with a warm window glass', () => {
    const names = [
      'offWhite', 'cream', 'coral', 'pink', 'gold', 'orange', 'blue', 'sky', 'teal', 'green',
      'purple', 'stone', 'slate', 'indigo', 'brick', 'wood', 'sand', 'glass', 'lit',
    ] as const
    for (const name of names) expect(landmark[name], name).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('motion', () => {
  it('waves and spins from the shared clock, so a frozen clock holds them still', () => {
    expect(wave(3, 0.1, 2)).toBe(wave(3, 0.1, 2))
    expect(Math.abs(wave(1.234, 0.1, 2))).toBeLessThanOrEqual(0.1)
    expect(wave(0, 0.1, 2)).toBe(0)
    expect(wave(0, 0.1, 2, Math.PI / 2)).toBeCloseTo(0.1)
    expect(spinAngle(0, 1)).toBe(0)
    expect(spinAngle(Math.PI, 1)).toBeCloseTo(Math.PI)
    // It stays in one turn, so a long visit never loses precision.
    expect(spinAngle(1e6, 1)).toBeGreaterThanOrEqual(0)
    expect(spinAngle(1e6, 1)).toBeLessThan(2 * Math.PI)
  })
})

describe('bevels', () => {
  it('are on by default and small beside a part', () => {
    expect(BEVEL.block).toBe(0.04)
    expect(BEVEL.round).toBeGreaterThan(0)
    expect(BEVEL.plate).toBeGreaterThan(0)
    expect(BEVEL.round).toBeLessThanOrEqual(BEVEL.block)
  })
})

describe('batching a landmark', () => {
  const part = (material: MeshBasicMaterial, x: number) => {
    const mesh = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), material)
    mesh.position.x = x
    mesh.userData.batch = true
    return mesh
  }

  it('merges still kit parts into one mesh per material, in the landmark’s own space, and hides them', () => {
    const red = new MeshBasicMaterial()
    const blue = new MeshBasicMaterial()
    const root = new Group()
    root.scale.setScalar(0.088)
    const a = part(red, -1)
    const b = part(red, 1)
    const c = part(blue, 0)
    // A part's outline shell is its child, and is merged with the other shells.
    const shell = part(blue, 0)
    a.add(shell)
    // A moving group and a picture (not a kit part) stay live.
    const moving = new Group()
    moving.userData.moving = true
    const swinging = part(red, 0.5)
    moving.add(swinging)
    const picture = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), red)
    root.add(a, b, c, moving, picture)

    const batch = batchStatic(root)
    expect(batch.meshes).toHaveLength(2)
    const merged = batch.meshes.find((m) => m.material === red)!
    merged.geometry.computeBoundingBox()
    // Both red parts, at x = -1 and x = 1, in model units, not scaled by the root.
    expect(merged.geometry.boundingBox!.min.x).toBeCloseTo(-1.1)
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(1.1)
    expect(merged.geometry.getAttribute('aBevel').count).toBe(merged.geometry.getAttribute('position').count)
    expect([a, b, c, shell].every((m) => !m.visible)).toBe(true)
    expect(swinging.visible).toBe(true)
    expect(picture.visible).toBe(true)
    expect(root.children).toContain(merged)

    batch.undo()
    expect([a, b, c, shell].every((m) => m.visible)).toBe(true)
    expect(root.children).not.toContain(merged)
  })

  it('gives every kit vertex its height in the landmark, for the painted gradient, moving parts included', () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    root.scale.setScalar(0.088)
    const high = part(material, 0)
    high.position.y = 1.5
    const moving = new Group()
    moving.userData.moving = true
    moving.position.y = 2
    const swinging = part(material, 0)
    moving.add(swinging)
    root.add(high, moving)
    const shared = swinging.geometry

    const batch = batchStatic(root)
    const merged = batch.meshes[0].geometry
    const heights = merged.getAttribute('aHeight')
    const ys = merged.getAttribute('position')
    expect(heights.count).toBe(ys.count)
    for (let i = 0; i < ys.count; i++) expect(heights.getX(i)).toBeCloseTo(ys.getY(i))
    expect(Math.min(...Array.from(heights.array as Float32Array))).toBeCloseTo(1.4)
    // The moving part stays live, on its own copy that knows it stands about 2 up.
    expect(swinging.geometry).not.toBe(shared)
    const lifted = Array.from(swinging.geometry.getAttribute('aHeight').array as Float32Array)
    expect(Math.min(...lifted)).toBeCloseTo(1.9)
    expect(Math.max(...lifted)).toBeCloseTo(2.1)
    // Every merged geometry also carries pane coordinates, so glass and other parts merge alike.
    expect(merged.getAttribute('aPane').itemSize).toBe(2)

    batch.undo()
    expect(swinging.geometry).toBe(shared)
  })
})
