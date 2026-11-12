import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  BEAM,
  CLOTH,
  GABLE_SLAB_BEVEL,
  RING_EDGE,
  archOutline,
  beamMesh,
  beamStrength,
  clothFold,
  clothMesh,
  clothOffset,
  clothWave,
  ellipseOutline,
  gableRoofParts,
  gableSoffit,
  heightWithin,
  PICTURE_ASPECT,
  pictureAspect,
  stackUp,
  peakMesh,
  peakTop,
  ringMesh,
  roofParts,
  roundSides,
  STREET_LAMP,
  streetLampParts,
  TRUSS,
  trussMembers,
  trussMesh,
  turnedMesh,
  turnedTop,
  waterMesh,
  type Point2,
  type Vec3,
} from '@/lib/world/kit'

/** The kit parts added for the first landmarks: a ring, a beam of light, water, a flag, and the outlines they use. */

const at = (arr: ArrayLike<number>, i: number) => new Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])

/** Every triangle of a mesh, with its corners and the normals there. */
function triangles(mesh: { positions: Float32Array; normals: Float32Array; index?: Uint32Array }) {
  const ids = mesh.index ? Array.from(mesh.index) : Array.from({ length: mesh.positions.length / 3 }, (_, i) => i)
  const out: Array<{ p: Vector3[]; n: Vector3[] }> = []
  for (let t = 0; t < ids.length; t += 3) {
    const corner = [ids[t], ids[t + 1], ids[t + 2]]
    out.push({ p: corner.map((i) => at(mesh.positions, i)), n: corner.map((i) => at(mesh.normals, i)) })
  }
  return out
}

/** True when every triangle with area winds the way its normals look. */
function windsWithNormals(mesh: { positions: Float32Array; normals: Float32Array; index?: Uint32Array }): boolean {
  return triangles(mesh).every(({ p, n }) => {
    const face = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]))
    if (face.length() < 1e-12) return true
    return face.dot(n[0].clone().add(n[1]).add(n[2])) > 0
  })
}

function bounds(positions: Float32Array) {
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < positions.length / 3; i++) {
    min.min(at(positions, i))
    max.max(at(positions, i))
  }
  return { min, max }
}

const unitNormals = (normals: Float32Array) => {
  for (let i = 0; i < normals.length / 3; i++) if (Math.abs(at(normals, i).length() - 1) > 1e-4) return false
  return true
}

describe('a ring', () => {
  it('is a hoop lying flat round the upright axis, exactly its size, with its normals pointing out of the tube', () => {
    const mesh = ringMesh(0.3, 0.04, 8, 24)
    const { min, max } = bounds(mesh.positions)
    expect(max.x).toBeCloseTo(0.32, 4)
    expect(min.z).toBeCloseTo(-0.32, 4)
    expect(max.y).toBeCloseTo(0.02, 4)
    expect(min.y).toBeCloseTo(-0.02, 4)
    expect(unitNormals(mesh.normals)).toBe(true)
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const p = at(mesh.positions, i)
      // The middle of the tube nearest this point, on the circle the ring runs round.
      const core = new Vector3(p.x, 0, p.z).setLength(0.3)
      expect(at(mesh.normals, i).dot(p.clone().sub(core).normalize())).toBeGreaterThan(0.999)
    }
    expect(windsWithNormals(mesh)).toBe(true)
    // It is all rounded, so all of it catches the edge light, but softly: at full strength a ring seen from above goes white.
    expect(Array.from(mesh.bevel).every((b) => Math.abs(b - RING_EDGE) < 1e-6)).toBe(true)
    expect(RING_EDGE).toBeGreaterThan(0)
    expect(RING_EDGE).toBeLessThan(0.5)
  })

  it('keeps its tube from passing through the middle, and draws nothing with no radius or no thickness', () => {
    const fat = ringMesh(0.1, 1, 8, 24)
    for (let i = 0; i < fat.positions.length / 3; i++) expect(Math.hypot(fat.positions[i * 3], fat.positions[i * 3 + 2])).toBeGreaterThan(0)
    expect(ringMesh(0, 0.04, 8, 24).positions.length).toBe(0)
    expect(ringMesh(0.3, 0, 8, 24).positions.length).toBe(0)
  })
})

describe('a lattice girder (truss)', () => {
  const triangleCount = (mesh: { index?: Uint32Array; positions: Float32Array }) => (mesh.index ? mesh.index.length : mesh.positions.length / 3) / 3

  it('stands from its base centre exactly its height, its chords on the corners of a square `width` across each face', () => {
    const mesh = trussMesh(1, 0.2, 4, 5, 0.014)
    const { min, max } = bounds(mesh.positions)
    expect(min.y).toBeCloseTo(0, 5)
    expect(max.y).toBeCloseTo(1, 5)
    // A chord's middle on each corner, half a bar out past it.
    for (const v of [max.x, max.z, -min.x, -min.z]) expect(v).toBeCloseTo(0.1 + 0.007, 3)
    expect(unitNormals(mesh.normals)).toBe(true)
    expect(windsWithNormals(mesh)).toBe(true)
    // Every bar's edges are chamfered, and the chamfers carry the edge light.
    expect(Array.from(mesh.bevel).some((b) => b === 1)).toBe(true)
    expect(Array.from(mesh.bevel).some((b) => b === 0)).toBe(true)
  })

  it('with three sides has a face to the front and its third chord at the back', () => {
    const { min, max } = bounds(trussMesh(1, 0.2, 3, 5, 0.014).positions)
    // The front face's two chords stand half as far forward as the back chord stands back.
    expect(-min.z).toBeGreaterThan(max.z * 1.5)
    expect(max.x).toBeCloseTo(-min.x, 5)
  })

  it('braces every bay on every face: more bays, more bars, up to its most', () => {
    const bars = (sides: number, bays: number) => triangleCount(trussMesh(1, 0.2, sides, bays, 0.014))
    const one = triangleCount(trussMesh(0.01, 0.01, 4, 1, 0.005)) / (4 + 4 + 2 * 4)
    // Chords, one diagonal a face a bay, and a strut round each end.
    expect(bars(4, 5)).toBeCloseTo((4 + 4 * 5 + 2 * 4) * one, 5)
    expect(bars(3, 6)).toBeCloseTo((3 + 3 * 6 + 2 * 3) * one, 5)
    expect(bars(4, 1e9)).toBe(bars(4, TRUSS.most))
  })

  it('takes 3 to 8 sides, as its docs say: chords, a diagonal a face a bay and two struts a face, at each count', () => {
    const bars = (sides: number, bays: number) => triangleCount(trussMesh(1, 0.2, sides, bays, 0.014))
    const one = triangleCount(trussMesh(0.01, 0.01, 4, 1, 0.005)) / (4 + 4 + 2 * 4)
    for (let n = 3; n <= 8; n++) expect(bars(n, 4), `${n} sides`).toBeCloseTo((n + n * 4 + 2 * n) * one, 5)
    // Fewer than three is three, more than eight is eight.
    expect(bars(2, 4)).toBe(bars(3, 4))
    expect(bars(12, 4)).toBe(bars(8, 4))
  })

  it('zigzags its diagonals up every face: each starts where the one below it ended and goes back across the face', () => {
    const near = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9
    const across = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2])
    for (const sides of [3, 4, 6]) {
      const { diagonals } = trussMembers(1, 0.2, sides, 5, 0.014)!
      expect(diagonals.length, `${sides} faces`).toBe(sides)
      for (const face of diagonals) {
        expect(face.length).toBe(5)
        face.forEach(([from, to], k) => {
          // Each crosses its face, rising one bay.
          expect(across(from, to)).toBeCloseTo(0.2, 5)
          expect(to[1] - from[1]).toBeCloseTo((1 - 0.014) / 5, 5)
          if (k === 0) return
          const [lastFrom, lastTo] = face[k - 1]
          // It starts at the top of the one below, and ends over that one's foot: a zigzag, not a spiral.
          expect(near(from, lastTo)).toBe(true)
          expect(across(to, lastFrom)).toBeCloseTo(0, 9)
        })
      }
    }
  })

  it('draws nothing with no height, no width or no bar', () => {
    expect(trussMesh(0, 0.2, 4, 5, 0.014).positions.length).toBe(0)
    expect(trussMesh(1, 0, 4, 5, 0.014).positions.length).toBe(0)
    expect(trussMesh(1, 0.2, 4, 5, 0).positions.length).toBe(0)
  })
})

describe('a street lamp', () => {
  const finite = (parts: NonNullable<ReturnType<typeof streetLampParts>>) =>
    [...(parts.foot ? [...parts.foot.size, ...parts.foot.at] : []), parts.post.bottom, parts.post.top, parts.post.height, ...parts.post.at, ...parts.lantern.size, ...parts.lantern.at, ...parts.cap.size, ...parts.cap.at].every(Number.isFinite)

  it('stacks post, lantern and cap from its foot to exactly its height, nothing floating', () => {
    for (const foot of [false, true]) {
      const lamp = streetLampParts(0.4, 0.04, foot)!
      const base = lamp.foot ? lamp.foot.at[1] + lamp.foot.size[1] / 2 : 0
      if (lamp.foot) expect(lamp.foot.at[1] - lamp.foot.size[1] / 2).toBeCloseTo(0, 9)
      expect(lamp.post.at[1]).toBeCloseTo(base, 9)
      expect(lamp.lantern.at[1] - lamp.lantern.size[1] / 2).toBeCloseTo(base + lamp.post.height, 9)
      expect(lamp.cap.at[1] - lamp.cap.size[1] / 2).toBeCloseTo(lamp.lantern.at[1] + lamp.lantern.size[1] / 2, 9)
      expect(lamp.cap.at[1] + lamp.cap.size[1] / 2).toBeCloseTo(0.4, 9)
      // The lantern is as wide as asked; the cap shelters it; the post is slimmer than the lantern and tapers.
      expect(lamp.lantern.size[0]).toBeCloseTo(0.04, 9)
      expect(lamp.cap.size[0]).toBeGreaterThan(lamp.lantern.size[0])
      expect(2 * lamp.post.bottom).toBeLessThan(lamp.lantern.size[0])
      expect(lamp.post.top).toBeLessThan(lamp.post.bottom)
    }
  })

  it('is the same lamp whatever its foot, the post taking what the foot leaves', () => {
    const plain = streetLampParts(0.4, 0.04, false)!
    const footed = streetLampParts(0.4, 0.04, true)!
    expect(footed.post.height).toBeCloseTo(plain.post.height - footed.foot!.size[1], 9)
    expect(footed.cap).toEqual(plain.cap)
  })

  it('draws nothing too short for its lantern and cap, and takes the usual lantern for one that is not a size', () => {
    for (const height of [0, -1, NaN, Infinity, 0.05]) expect(streetLampParts(height, 0.04, false), String(height)).toBeNull()
    for (const lantern of [0, -1, NaN, Infinity]) {
      const lamp = streetLampParts(0.4, lantern, true)
      expect(lamp, String(lantern)).not.toBeNull()
      expect(lamp!.lantern.size[0]).toBe(STREET_LAMP.lantern)
      expect(finite(lamp!)).toBe(true)
    }
  })
})

describe('a beam of light', () => {
  it('runs from its origin along +Z, widening from `near` to `far`, open at both ends, its normals square to its sides', () => {
    const mesh = beamMesh(1.2, 0.05, 0.25, 16)
    const { min, max } = bounds(mesh.positions)
    expect(min.z).toBeCloseTo(0, 6)
    expect(max.z).toBeCloseTo(1.2, 6)
    expect(max.x).toBeCloseTo(0.25, 2)
    expect(unitNormals(mesh.normals)).toBe(true)
    expect(windsWithNormals(mesh)).toBe(true)
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const p = at(mesh.positions, i)
      const n = at(mesh.normals, i)
      // Square to the slope of the side: along the side the radius grows 0.2 over 1.2.
      const along = new Vector3(p.x, p.y, 0).normalize().multiplyScalar(0.2).add(new Vector3(0, 0, 1.2)).normalize()
      expect(Math.abs(n.dot(along))).toBeLessThan(1e-4)
      // Out from the axis.
      expect(n.x * p.x + n.y * p.y).toBeGreaterThan(0)
    }
  })

  it('says how far along it each vertex is, 0 at the lamp and 1 at its end', () => {
    const mesh = beamMesh(1.2, 0.05, 0.25, 16)
    for (let i = 0; i < mesh.along.length; i++) expect(mesh.along[i]).toBeCloseTo(mesh.positions[i * 3 + 2] / 1.2, 6)
    expect(Math.min(...mesh.along)).toBe(0)
    expect(Math.max(...mesh.along)).toBe(1)
  })

  it('is soft by day and stronger at night, brighter than white only after dark, so only the night beam blooms', () => {
    const day = beamStrength(1)
    const dusk = beamStrength(1.5)
    const night = beamStrength(2.3)
    expect(day.alpha).toBeCloseTo(BEAM.day.alpha)
    expect(night.alpha).toBeCloseTo(BEAM.night.alpha)
    expect(day.alpha).toBeLessThan(dusk.alpha)
    expect(dusk.alpha).toBeLessThan(night.alpha)
    // By day it never brightens what is behind it past its own colour, so it cannot bloom; at night it does.
    expect(day.gain).toBeLessThanOrEqual(1)
    expect(night.gain).toBeGreaterThan(1)
    // A glow that is not a number is the day's.
    expect(beamStrength(NaN)).toEqual(day)
  })
})

describe('water', () => {
  const oval = ellipseOutline(0.3, 0.2, 20)

  it('is a flat surface facing up, filling its outline (seen from above, as x and z)', () => {
    const mesh = waterMesh(oval, 4)
    const { min, max } = bounds(mesh.positions)
    expect(max.x).toBeCloseTo(0.3, 4)
    expect(min.z).toBeCloseTo(-0.2, 2)
    expect(max.y).toBe(0)
    expect(min.y).toBe(0)
    for (let i = 0; i < mesh.normals.length / 3; i++) expect(at(mesh.normals, i).toArray()).toEqual([0, 1, 0])
    expect(windsWithNormals(mesh)).toBe(true)
  })

  it('knows how near the bank each vertex is: 0 in the middle, 1 at the edge', () => {
    const mesh = waterMesh(oval, 4)
    expect(Math.min(...mesh.edge)).toBe(0)
    expect(Math.max(...mesh.edge)).toBe(1)
    for (let i = 0; i < mesh.edge.length; i++) {
      if (mesh.edge[i] !== 1) continue
      const p = at(mesh.positions, i)
      // Every edge vertex is on the outline: (x/0.3)^2 + (z/0.2)^2 = 1.
      expect((p.x / 0.3) ** 2 + (p.z / 0.2) ** 2).toBeCloseTo(1, 4)
    }
  })

  it('draws nothing for an outline with no area', () => {
    expect(waterMesh([[0, 0], [1, 0], [2, 0]], 4).positions.length).toBe(0)
    expect(waterMesh([], 4).positions.length).toBe(0)
  })
})

describe('a flag of cloth', () => {
  it('is one thin slab running out from its hoist along +X and hanging down, its faces looking outward', () => {
    const mesh = clothMesh(0.3, 0.18, 8, 0)
    const { min, max } = bounds(mesh.positions)
    expect(min.x).toBeCloseTo(0)
    expect(max.x).toBeCloseTo(0.3)
    expect(max.y).toBeCloseTo(0)
    expect(min.y).toBeCloseTo(-0.18)
    expect(max.z - min.z).toBeCloseTo(CLOTH.thickness)
    expect(unitNormals(mesh.normals)).toBe(true)
    expect(windsWithNormals(mesh)).toBe(true)
  })

  it('has its outline as a copy grown all round by the line’s width', () => {
    const shell = bounds(clothMesh(0.3, 0.18, 8, 0.005).positions)
    expect(shell.min.x).toBeCloseTo(-0.005)
    expect(shell.max.x).toBeCloseTo(0.305)
    expect(shell.min.y).toBeCloseTo(-0.185)
    expect(shell.max.z - shell.min.z).toBeCloseTo(CLOTH.thickness + 0.01)
  })

  it('tapers toward its fly end by `taper`, a whole taper narrowing it to a point halfway down its hoist', () => {
    /** The cloth's lowest and highest y at its fly end and at its hoist. */
    const ends = (mesh: { positions: Float32Array }, width: number) => {
      const at = (x: number) => {
        const ys: number[] = []
        for (let i = 0; i < mesh.positions.length / 3; i++) if (Math.abs(mesh.positions[i * 3] - x) < 1e-6) ys.push(mesh.positions[i * 3 + 1])
        return [Math.min(...ys), Math.max(...ys)]
      }
      return { hoist: at(0), fly: at(width) }
    }
    const point = clothMesh(0.3, 0.18, 8, 0, 1)
    const whole = ends(point, 0.3)
    expect(whole.hoist[0]).toBeCloseTo(-0.18)
    expect(whole.hoist[1]).toBeCloseTo(0)
    // A point, halfway down the hoist.
    expect(whole.fly[0]).toBeCloseTo(-0.09)
    expect(whole.fly[1]).toBeCloseTo(-0.09)
    // Half a taper leaves the fly end half as deep, still centred on the hoist's middle.
    const half = ends(clothMesh(0.3, 0.18, 8, 0, 0.5), 0.3)
    expect(half.fly[0]).toBeCloseTo(-0.135)
    expect(half.fly[1]).toBeCloseTo(-0.045)
    // The edges run straight from the hoist to the fly end: halfway along, halfway in.
    const mid = ends(point, 0.15)
    expect(mid.fly[0]).toBeCloseTo(-0.135)
    expect(mid.fly[1]).toBeCloseTo(-0.045)
    for (const mesh of [point, clothMesh(0.3, 0.18, 8, 0, 0.5)]) {
      expect(unitNormals(mesh.normals)).toBe(true)
      expect(windsWithNormals(mesh)).toBe(true)
    }
    // Its outline is grown all round it, round the point too.
    const shell = bounds(clothMesh(0.3, 0.18, 8, 0.005, 1).positions)
    expect(shell.max.x).toBeCloseTo(0.305)
    expect(shell.max.y).toBeCloseTo(0.005)
    expect(shell.min.y).toBeCloseTo(-0.185)
    // No taper, or one that is not a number, is the plain flag; past a whole one counts as whole.
    expect(clothMesh(0.3, 0.18, 8, 0, 0).positions).toEqual(clothMesh(0.3, 0.18, 8, 0).positions)
    expect(clothMesh(0.3, 0.18, 8, 0, NaN).positions).toEqual(clothMesh(0.3, 0.18, 8, 0).positions)
    expect(clothMesh(0.3, 0.18, 8, 0, -2).positions).toEqual(clothMesh(0.3, 0.18, 8, 0).positions)
    expect(clothMesh(0.3, 0.18, 8, 0, 5).positions).toEqual(point.positions)
  })

  it('has its outline’s columns where the cloth’s are, so as they ripple together the outline never pokes through', () => {
    const xsOf = (m: { positions: Float32Array }) => new Set(Array.from({ length: m.positions.length / 3 }, (_, i) => m.positions[i * 3].toFixed(5)))
    const body = xsOf(clothMesh(0.22, 0.13, CLOTH.columns, 0))
    const shell = xsOf(clothMesh(0.22, 0.13, CLOTH.columns, 0.004))
    for (const x of body) expect(shell.has(x), x).toBe(true)
    // Beyond those, only the two grown ends.
    expect(shell.size).toBe(body.size + 2)
  })

  it('is cut into columns along its length, so it can bend in a ripple', () => {
    const xs = new Set(Array.from({ length: clothMesh(0.3, 0.18, 8, 0).positions.length / 3 }, (_, i) => clothMesh(0.3, 0.18, 8, 0).positions[i * 3].toFixed(4)))
    expect(xs.size).toBeGreaterThanOrEqual(9)
  })

  it('ripples from the shared clock: still at the hoist, growing toward the fly end, never past its amplitude', () => {
    const wave = clothWave(0.3, 0.12, 1.6)
    expect(wave.amplitude).toBeCloseTo(0.3 * 0.12)
    for (const t of [0, 1.3, 7, 1000]) {
      expect(clothOffset(0, t, wave)).toBeCloseTo(0)
      for (let x = 0; x <= 0.3; x += 0.01) expect(Math.abs(clothOffset(x, t, wave))).toBeLessThanOrEqual(wave.amplitude + 1e-9)
    }
    // A clock that stands still (reduced motion) holds the cloth still.
    expect(clothOffset(0.2, 5, wave)).toBe(clothOffset(0.2, 5, wave))
    // And it does move as time passes.
    expect(clothOffset(0.25, 0, wave)).not.toBeCloseTo(clothOffset(0.25, 1, wave), 4)
  })

  it('paints its folds as a soft shade that only darkens, at most CLOTH.fold, and none on a still flag', () => {
    const wave = clothWave(0.3, 0.12, 1.6)
    let darkest = 1
    let lightest = 0
    for (let x = 0; x <= 0.3; x += 0.005) {
      for (const t of [0, 0.7, 2.1, 9]) {
        const f = clothFold(x, t, wave)
        expect(f).toBeGreaterThanOrEqual(1 - CLOTH.fold - 1e-9)
        expect(f).toBeLessThanOrEqual(1)
        darkest = Math.min(darkest, f)
        lightest = Math.max(lightest, f)
      }
    }
    // It does vary across the ripple, smoothly: neighbouring points along the cloth differ by little.
    expect(lightest - darkest).toBeGreaterThan(CLOTH.fold * 0.5)
    for (let x = 0; x < 0.3; x += 0.005) expect(Math.abs(clothFold(x + 0.005, 1, wave) - clothFold(x, 1, wave))).toBeLessThan(CLOTH.fold * 0.2)
    // A flag with no ripple is one even colour.
    const still = clothWave(0.3, 0, 1.6)
    for (const x of [0, 0.1, 0.3]) expect(clothFold(x, 1, still)).toBe(1)
  })

  it('makes any amount and speed usable', () => {
    for (const amount of [0.12, 0, -1, NaN, Infinity, 9]) {
      for (const speed of [1.6, 0, -2, NaN, Infinity, 1e6]) {
        const wave = clothWave(0.3, amount, speed)
        expect(Number.isFinite(wave.amplitude) && wave.amplitude >= 0).toBe(true)
        expect(wave.amplitude).toBeLessThanOrEqual(0.3 * CLOTH.maxAmount)
        expect(Number.isFinite(wave.speed) && wave.speed >= 0 && wave.speed <= CLOTH.maxSpeed).toBe(true)
        for (const x of [0, 0.1, 0.3]) expect(Number.isFinite(clothOffset(x, 3, wave))).toBe(true)
      }
    }
  })
})

describe('a gabled roof with gable walls', () => {
  const size: [number, number, number] = [0.72, 0.42, 0.5]
  const [w, h, d] = size
  const overhang = 0.07
  const fascia = 0.06
  /** Where the slabs' sloping underside meets the eave: the soffit's inner edge. */
  const Z = d / 2 + overhang - gableSoffit(fascia, overhang)
  /** The height of the slabs' underside `z` in from the ridge (flat under the soffit). */
  const underside = (z: number) => Math.max(0, (h - fascia) * (1 - Math.abs(z) / Z))

  it('is two sloped slabs as big overall as the solid roof, hollow underneath', () => {
    const open = gableRoofParts(size, overhang, fascia, 0.03)
    const solid = bounds(roofParts('gable', size, overhang, fascia, 0.03, 0, false).body.positions)
    const slabs = bounds(open.slabs.positions)
    expect(slabs.min.distanceTo(solid.min)).toBeLessThan(1e-4)
    expect(slabs.max.distanceTo(solid.max)).toBeLessThan(1e-4)
    // Nothing of the slabs comes down below their underside: the gable ends are open under them. (A rounded
    // hull follows a slanted face to within about two of its rounding widths, GABLE_SLAB_BEVEL, so it may stray that little.)
    for (let i = 0; i < open.slabs.positions.length / 3; i++) {
      const p = at(open.slabs.positions, i)
      expect(p.y).toBeGreaterThanOrEqual(underside(p.z) - 2 * GABLE_SLAB_BEVEL)
    }
    expect(windsWithNormals(open.slabs)).toBe(true)
    expect(unitNormals(open.slabs.normals)).toBe(true)
  })

  it('has an attic in the walls’ plane under them: as wide and deep as the walls, standing on the wall top, inside the slabs', () => {
    const { attic } = gableRoofParts(size, overhang, fascia, 0.03)
    const b = bounds(attic.positions)
    expect(b.min.x).toBeCloseTo(-w / 2, 4)
    expect(b.max.x).toBeCloseTo(w / 2, 4)
    expect(b.min.z).toBeCloseTo(-d / 2, 4)
    expect(b.max.z).toBeCloseTo(d / 2, 4)
    expect(b.min.y).toBeCloseTo(0, 4)
    for (let i = 0; i < attic.positions.length / 3; i++) {
      const p = at(attic.positions, i)
      expect(p.y).toBeLessThanOrEqual(underside(p.z) + 0.002)
    }
    expect(windsWithNormals(attic)).toBe(true)
  })
})

describe('a landmark’s heights', () => {
  it('takes its place’s height within the range it is built for, and the nearest end of it outside', () => {
    expect(heightWithin(1.2, [1.0, 1.6])).toBe(1.2)
    expect(heightWithin(0.4, [1.0, 1.6])).toBe(1.0)
    expect(heightWithin(2.0, [1.0, 1.6])).toBe(1.6)
    expect(heightWithin(NaN, [1.0, 1.6])).toBe(1.0)
  })

  it('draws a picture at the shape its size in pixels gives, and a plain 4 by 3 without one', () => {
    expect(pictureAspect([1600, 2009])).toBeCloseTo(1600 / 2009, 12)
    expect(pictureAspect([920, 430])).toBeCloseTo(920 / 430, 12)
    for (const odd of [undefined, [0, 100], [100, 0], [-1, 2], [NaN, 5], [Infinity, 5]] as Array<[number, number] | undefined>) {
      expect(pictureAspect(odd), String(odd)).toBe(PICTURE_ASPECT)
    }
    expect(PICTURE_ASPECT).toBeCloseTo(4 / 3, 12)
  })

  it('stacks parts from the ground up: each starts where the one below ends', () => {
    expect(stackUp(0.1, [0.2, 0.3, 0.05])).toEqual([0.1, 0.30000000000000004, 0.6000000000000001, 0.6500000000000001].map((v) => expect.closeTo(v, 9)))
  })
})

describe('what a part sits on', () => {
  it('knows the true top of a cone, below its nominal height where its tip is rounded', () => {
    const top = peakTop(0.13, 0.4, 0.03)
    expect(top).toBeLessThan(0.4)
    expect(top).toBeGreaterThan(0.4 - 0.1)
    expect(top).toBeCloseTo(bounds(peakMesh(0.13, 0.4, roundSides(0.13), 0.03).positions).max.y, 6)
  })

  it('knows the true top of a turned part', () => {
    const profile: Point2[] = [[0, 0], [0.17, 0], [0.16, 0.035], [0.12, 0.1], [0.06, 0.145], [0, 0.165]]
    expect(turnedTop(profile, 0.018)).toBeCloseTo(bounds(turnedMesh(profile, roundSides(0.17), 0.018).positions).max.y, 6)
    expect(turnedTop(profile, 0.018)).toBeLessThanOrEqual(0.165)
  })
})

describe('outlines for doors, gates and ponds', () => {
  it('draws an arch: square at the foot, round at the head, standing on y = 0', () => {
    const arch = archOutline(0.2, 0.3, 6)
    const xs = arch.map(([x]) => x)
    const ys = arch.map(([, y]) => y)
    expect(Math.min(...xs)).toBeCloseTo(-0.1)
    expect(Math.max(...xs)).toBeCloseTo(0.1)
    expect(Math.min(...ys)).toBeCloseTo(0)
    expect(Math.max(...ys)).toBeCloseTo(0.3)
    // Anticlockwise, as the other outlines are.
    let area = 0
    arch.forEach(([x1, y1], i) => {
      const [x2, y2] = arch[(i + 1) % arch.length]
      area += x1 * y2 - x2 * y1
    })
    expect(area).toBeGreaterThan(0)
    // Never shorter than its own round head.
    expect(Math.max(...archOutline(0.4, 0.1, 6).map(([, y]) => y))).toBeCloseTo(0.2)
  })

  it('draws an oval anticlockwise, and with a notch cut out toward the front for a lily pad', () => {
    const oval = ellipseOutline(0.3, 0.2, 16)
    expect(oval).toHaveLength(16)
    for (const [x, y] of oval) expect((x / 0.3) ** 2 + (y / 0.2) ** 2).toBeCloseTo(1)
    const pad: Point2[] = ellipseOutline(0.1, 0.1, 16, 0.6)
    // The notch comes in to the middle.
    expect(pad.some(([x, y]) => x === 0 && y === 0)).toBe(true)
    expect(pad.every(([x, y]) => Math.hypot(x, y) <= 0.1 + 1e-9)).toBe(true)
  })
})
