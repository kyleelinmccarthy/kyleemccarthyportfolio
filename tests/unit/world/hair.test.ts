import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { guideLook } from '@/content/characters'
import { figureOf } from '@/lib/world/figure'
import { CROWN, WAVES, longWaves } from '@/lib/world/hair'
import { SWEPT, sweptMesh, type Point2, type Vec3 } from '@/lib/world/kit'

const at = (values: Float32Array, i: number) => new Vector3(values[i * 3], values[i * 3 + 1], values[i * 3 + 2])

/** True when every triangle's face points the way its corners' normals do. */
function windsWithNormals(mesh: { positions: Float32Array; normals: Float32Array; index?: Uint32Array }) {
  const index = mesh.index!
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]]
    const face = at(mesh.positions, b).sub(at(mesh.positions, a)).cross(at(mesh.positions, c).sub(at(mesh.positions, a)))
    // A triangle drawn to a point has no face to check.
    if (face.length() < 1e-10) continue
    const normal = at(mesh.normals, a).add(at(mesh.normals, b)).add(at(mesh.normals, c))
    if (face.dot(normal) <= 0) return false
  }
  return true
}

describe('a swept ribbon', () => {
  const down: Vec3[] = [[0, 0, 0], [0, -0.5, 0], [0, -1, 0]]
  const even: Point2[] = [[0.2, 0.1], [0.2, 0.1], [0.2, 0.1]]

  it('runs along its path, as broad and as thick as it is told, its thin side to its facing', () => {
    const mesh = sweptMesh(down, even, [0, 0, 1], 8, 8)
    let [x, z, top, bottom] = [0, 0, -Infinity, Infinity]
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const p = at(mesh.positions, i)
      x = Math.max(x, Math.abs(p.x))
      z = Math.max(z, Math.abs(p.z))
      top = Math.max(top, p.y)
      bottom = Math.min(bottom, p.y)
    }
    expect(x).toBeCloseTo(0.1, 4)
    expect(z).toBeCloseTo(0.05, 4)
    // Each end is closed just past the path's, by as much as the ribbon is thin.
    expect(top).toBeCloseTo(0.05, 4)
    expect(bottom).toBeCloseTo(-1.05, 4)
  })

  it('is one closed shape, wound outward, with unit normals and a soft edge light', () => {
    const wavy: Vec3[] = [[0, 0, 0], [0.1, -0.3, 0.05], [-0.1, -0.6, 0], [0.05, -0.9, 0.1]]
    const mesh = sweptMesh(wavy, [[0.1, 0.05], [0.2, 0.1], [0.15, 0.08], [0, 0]], [0, 0, 1], 6, 9)
    for (let i = 0; i < mesh.normals.length / 3; i++) expect(at(mesh.normals, i).length()).toBeCloseTo(1, 4)
    expect(windsWithNormals(mesh)).toBe(true)
    // Closed: every edge is shared by two triangles (the seam's doubled points aside, each point has neighbours all round).
    expect(mesh.index!.length / 3).toBe(9 * 6 * 2 + 6 * 2)
    expect(Array.from(mesh.bevel).every((b) => Math.abs(b - SWEPT.edge) < 1e-6)).toBe(true)
  })

  it('passes through every point of its path', () => {
    const path: Vec3[] = [[0, 0, 0], [0.2, -0.3, 0], [0, -0.6, 0.1]]
    const mesh = sweptMesh(path, [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02]], [0, 0, 1], 6, 12)
    for (const point of path) {
      let nearest = Infinity
      for (let i = 0; i < mesh.positions.length / 3; i++) nearest = Math.min(nearest, at(mesh.positions, i).distanceTo(new Vector3(...point)))
      expect(nearest).toBeLessThan(0.021)
    }
  })

  it('draws nothing from what is not a ribbon, and never a number that is not one', () => {
    expect(sweptMesh([[0, 0, 0]], [[0.1, 0.1]], [0, 0, 1], 8, 8).positions.length).toBe(0)
    expect(sweptMesh(down, [[0, 0], [0, 0], [0, 0]], [0, 0, 1], 8, 8).positions.length).toBe(0)
    expect(sweptMesh(down, even.slice(0, 2), [0, 0, 1], 8, 8).positions.length).toBe(0)
    expect(sweptMesh([[0, 0, 0], [NaN, 0, 0], [0, -1, 0]], even, [0, 0, 1], 8, 8).positions.length).toBe(0)
    // A path of no length, a facing along the path, a facing of nothing, a width that is not a number, absurd detail.
    for (const mesh of [
      sweptMesh([[0, 0, 0], [0, 0, 0], [0, 0, 0]], even, [0, 0, 1], 8, 8),
      sweptMesh(down, even, [0, -1, 0], 8, 8),
      sweptMesh(down, even, [0, 0, 0], 8, 8),
      sweptMesh(down, [[NaN, 0.1], [0.2, 0.1], [0.2, Infinity]], [NaN, 0, 1], 8, 8),
      sweptMesh(down, even, [0, 0, 1], 1e9, 1e9),
      sweptMesh(down, even, [0, 0, 1], NaN, -3),
    ]) {
      expect(Array.from(mesh.positions).every(Number.isFinite)).toBe(true)
      for (let i = 0; i < mesh.normals.length / 3; i++) expect(at(mesh.normals, i).length()).toBeGreaterThan(0.5)
      expect(mesh.positions.length / 3).toBeLessThanOrEqual((SWEPT.steps + 1) * (SWEPT.sides + 1) + 2)
    }
  })
})

describe('long wavy hair', () => {
  const f = figureOf(guideLook)
  const [hw, hh, hd] = f.head.size
  const locks = longWaves(f)
  const elbows = f.shoulder.y - f.arm.upper - f.head.at[1]

  it('is many locks, a path and a width for each point of it, every number finite', () => {
    expect(locks.length).toBeGreaterThanOrEqual(12)
    for (const lock of locks) {
      expect(lock.widths).toHaveLength(lock.path.length)
      expect(lock.path.flat().every(Number.isFinite)).toBe(true)
      expect(lock.widths.flat().every((w) => Number.isFinite(w) && w >= 0)).toBe(true)
      expect(new Vector3(...lock.facing).length()).toBeGreaterThan(0.5)
    }
  })

  it('falls from the crown past the shoulders to about the elbows, each lock ending in a point', () => {
    const crownTop = hh * (CROWN.up + CROWN.size[1] / 2)
    for (const lock of locks) {
      const [first, last] = [lock.path[0], lock.path[lock.path.length - 1]]
      expect(first[1]).toBeLessThan(crownTop)
      expect(first[1]).toBeGreaterThan(0)
      expect(last[1]).toBeLessThan(f.shoulder.y - f.head.at[1] - hh * 0.2)
      expect(last[1]).toBeGreaterThan(elbows - hh * 0.25)
      expect(lock.widths[lock.widths.length - 1]).toEqual([0, 0])
    }
  })

  it('waves: every lock swings from side to side as it falls, and no two lie alike', () => {
    for (const lock of locks) {
      // Its sideways drift changes direction at least twice below the crown.
      const side = lock.path.map(([x, , z]) => Math.atan2(x, z))
      let turns = 0
      for (let i = 2; i < side.length; i++) if ((side[i] - side[i - 1]) * (side[i - 1] - side[i - 2]) < 0) turns++
      expect(turns).toBeGreaterThanOrEqual(2)
    }
    const ends = locks.filter((l) => l.outline).map((l) => l.path[l.path.length - 1].map((v) => v.toFixed(4)).join())
    expect(new Set(ends).size).toBe(ends.length)
    expect(WAVES.count).toBeGreaterThan(1)
  })

  it('leaves the face open: nothing in front of it between the two locks that frame it', () => {
    const faceHalf = f.face.size[0] / 2
    for (const lock of locks) {
      for (const [x, y, z] of lock.path) {
        // From the brow to the chin, at the face's front.
        if (y > hh * 0.2 || y < -hh * 0.45 || z < hd * 0.3) continue
        expect(Math.abs(x)).toBeGreaterThan(faceHalf * 0.85)
      }
    }
  })

  it('stands clear of the shoulders and wider than the head, and is fuller on her left', () => {
    const widest = Math.max(...locks.flatMap((l) => l.path.map(([x]) => Math.abs(x))))
    expect(widest).toBeGreaterThan(f.shoulder.x + f.arm.shoulder)
    expect(widest).toBeGreaterThan(hw * 0.6)
    const broad = (side: number) => locks.filter((l) => l.outline && l.facing[0] * side > 0.5).reduce((sum, l) => sum + Math.max(...l.widths.map(([w]) => w)), 0)
    expect(broad(1)).toBeGreaterThan(broad(-1))
  })

  it('carries the blonde at the front: a broad streak on her right, a slim one on her left', () => {
    const streaks = locks.filter((l) => l.streak)
    expect(streaks).toHaveLength(2)
    const [right, left] = [streaks.find((l) => l.facing[0] < 0)!, streaks.find((l) => l.facing[0] > 0)!]
    const broadest = (l: (typeof locks)[number]) => Math.max(...l.widths.map(([w]) => w))
    expect(broadest(right)).toBeGreaterThan(broadest(left) * 1.5)
    for (const l of streaks) expect(Math.max(...l.path.map(([, , z]) => z))).toBeGreaterThan(0)
  })
})
