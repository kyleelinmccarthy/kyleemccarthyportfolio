import { describe, it, expect } from 'vitest'
import { Euler, Vector3 } from 'three'
import {
  MIN_ROUND,
  RAIN,
  WATER,
  WATER_PERIODS,
  brickCourses,
  pointing,
  puffCloudMesh,
  rainMesh,
  rainTravel,
  roundedMesh,
  softSegments,
  tuftSegments,
  tuftedMesh,
  wrapTime,
  type MeshData,
  type Vec3,
} from '@/lib/world/kit'

/** The kit parts added for the first characters: soft shapes. */

const at = (arr: ArrayLike<number>, i: number) => new Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
const count = (mesh: MeshData) => mesh.positions.length / 3

function bounds(positions: Float32Array) {
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < positions.length / 3; i++) {
    min.min(at(positions, i))
    max.max(at(positions, i))
  }
  return { min, max }
}

/** True when every triangle with area winds the way its corners' normals look, and away from the middle. */
function windsOutward(mesh: MeshData): boolean {
  const ids = Array.from(mesh.index!)
  for (let t = 0; t < ids.length; t += 3) {
    const [a, b, c] = [ids[t], ids[t + 1], ids[t + 2]].map((i) => at(mesh.positions, i))
    const face = b.clone().sub(a).cross(c.clone().sub(a))
    if (face.length() < 1e-12) continue
    const n = at(mesh.normals, ids[t]).add(at(mesh.normals, ids[t + 1])).add(at(mesh.normals, ids[t + 2]))
    if (face.dot(n) <= 0 || face.dot(a.clone().add(b).add(c)) <= 0) return false
  }
  return true
}

/** True when no two vertices stand in the same place: the seam and the poles are shared, so the normals are continuous. */
function noSeam(mesh: MeshData): boolean {
  const seen = new Set<string>()
  for (let i = 0; i < count(mesh); i++) {
    const key = at(mesh.positions, i).toArray().map((x) => x.toFixed(6)).join(',')
    if (seen.has(key)) return false
    seen.add(key)
  }
  return true
}

const unitNormals = (mesh: MeshData) => Array.from({ length: count(mesh) }, (_, i) => at(mesh.normals, i).length()).every((l) => Math.abs(l - 1) < 1e-4)

describe('a shader’s clock', () => {
  it('is the shared clock brought within one period, smooth for however long the visit', () => {
    expect(wrapTime(2.5, 2)).toBeCloseTo(0.5, 12)
    expect(wrapTime(-0.5, 2)).toBeCloseTo(1.5, 12)
    // A week in, it keeps the fraction a single-precision clock has lost: a sixtieth of a second still moves it.
    const week = 7 * 24 * 3600
    const step = (wrapTime(week + 1 / 60, 0.9) - wrapTime(week, 0.9) + 0.9) % 0.9
    expect(step).toBeCloseTo(1 / 60, 9)
    expect(Math.fround(week + 1 / 60) - Math.fround(week)).not.toBeCloseTo(1 / 60, 3)
    for (const [t, p] of [[1, 0], [1, -1], [1, NaN], [NaN, 1], [Infinity, 1], [1, Infinity]]) expect(wrapTime(t, p), `${t} ${p}`).toBe(0)
  })

  it('wraps water’s two motions each to its own period, so it drifts exactly as it would on the raw clock', () => {
    // Its rings: one ring out per period. Its arcs: one turn per period.
    expect(WATER_PERIODS.rings * WATER.speed).toBeCloseTo(1, 12)
    expect(WATER_PERIODS.drift * WATER.drift).toBeCloseTo(Math.PI * 2, 12)
    const fract = (x: number) => x - Math.floor(x)
    for (const t of [0.3, 47.25, 3 * 24 * 3600 + 0.01, 7 * 24 * 3600 + 12.34]) {
      // What the shader paints from the wrapped clocks, against the same sums on the raw clock (in double precision).
      const ring = fract(wrapTime(t, WATER_PERIODS.rings) * WATER.speed)
      expect(Math.min(Math.abs(ring - fract(t * WATER.speed)), 1 - Math.abs(ring - fract(t * WATER.speed))), String(t)).toBeLessThan(1e-6)
      expect(Math.sin(wrapTime(t, WATER_PERIODS.drift) * WATER.drift), String(t)).toBeCloseTo(Math.sin(t * WATER.drift), 6)
    }
  })
})

describe('laying a part from one point to another', () => {
  it('turns +Y onto the way from one to the other, as long as the gap, standing on the first', () => {
    const cases: Array<[Vec3, Vec3]> = [
      [[0, 0, 0], [0, 1, 0]],
      [[0.1, 0.2, 0.3], [0.5, 0.4, -0.2]],
      [[0, 1, 0], [0, 0, 0]],
      [[0, 0, 0], [1, 0, 0]],
      [[0, 0, 0], [0, 0, -2]],
    ]
    for (const [from, to] of cases) {
      const { at: start, rot, length } = pointing(from, to)
      const d = new Vector3(...to).sub(new Vector3(...from))
      expect(length).toBeCloseTo(d.length(), 9)
      expect(start).toEqual(from)
      const up = new Vector3(0, 1, 0).applyEuler(new Euler(...rot))
      expect(up.distanceTo(d.normalize()), `${from} → ${to}`).toBeLessThan(1e-9)
    }
  })

  it('gives no turn and no length for two points in one place, or numbers that are not', () => {
    expect(pointing([1, 2, 3], [1, 2, 3])).toEqual({ at: [1, 2, 3], rot: [0, 0, 0], length: 0 })
    const bad = pointing([NaN, 0, 0], [0, Infinity, 0])
    expect([...bad.at, ...bad.rot, bad.length].every(Number.isFinite)).toBe(true)
  })
})

describe('soft segments', () => {
  it('step round a soft shape in fours, finer as it grows, half as many from pole to pole', () => {
    for (const r of [0, 0.02, 0.1, 0.3, 1, 5, NaN]) {
      const { across, down } = softSegments(r)
      expect(across % 4, String(r)).toBe(0)
      expect(across).toBeGreaterThanOrEqual(12)
      expect(across).toBeLessThanOrEqual(40)
      expect(down).toBe(across / 2)
    }
    expect(softSegments(0.4).across).toBeGreaterThan(softSegments(0.05).across)
  })
})

describe('a rounded box', () => {
  it('fills exactly its size, round its middle, with unit normals pointing out and triangles facing them', () => {
    const mesh = roundedMesh([0.3, 0.26, 0.2], 0.35, 24, 12)
    const { min, max } = bounds(mesh.positions)
    expect(max.toArray().map((x) => +x.toFixed(4))).toEqual([0.15, 0.13, 0.1])
    expect(min.toArray().map((x) => +x.toFixed(4))).toEqual([-0.15, -0.13, -0.1])
    expect(unitNormals(mesh)).toBe(true)
    for (let i = 0; i < count(mesh); i++) expect(at(mesh.normals, i).dot(at(mesh.positions, i))).toBeGreaterThan(0)
    expect(windsOutward(mesh)).toBe(true)
    // One vertex at each pole and a shared seam: no two vertices in one place, so its outline has no crack.
    expect(noSeam(mesh)).toBe(true)
  })

  it('has flat faces with no bevel on them, and its rounded edges carry the bevel weight', () => {
    const mesh = roundedMesh([0.3, 0.3, 0.3], 0.3, 24, 12)
    let face = 0
    let edge = 0
    for (let i = 0; i < count(mesh); i++) {
      const n = at(mesh.normals, i)
      const most = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z))
      if (most > 0.999) {
        face++
        expect(mesh.bevel[i]).toBe(0)
      }
      if (most < 0.75) {
        edge++
        expect(mesh.bevel[i]).toBeGreaterThan(0.9)
      }
    }
    expect(face).toBeGreaterThan(0)
    expect(edge).toBeGreaterThan(0)
    // The middle of each face is flat: the front's middle lies on the plane z = 0.15.
    const front = Array.from({ length: count(mesh) }, (_, i) => at(mesh.positions, i)).filter((p) => Math.abs(p.x) < 0.05 && Math.abs(p.y) < 0.05 && p.z > 0)
    expect(front.length).toBeGreaterThan(0)
    for (const p of front) expect(p.z).toBeCloseTo(0.15, 3)
  })

  it('is an ellipsoid at its roundest, with no edge to light', () => {
    const mesh = roundedMesh([0.4, 0.2, 0.3], 1, 24, 12)
    for (let i = 0; i < count(mesh); i++) {
      const p = at(mesh.positions, i)
      expect((p.x / 0.2) ** 2 + (p.y / 0.1) ** 2 + (p.z / 0.15) ** 2).toBeCloseTo(1, 4)
      expect(mesh.bevel[i]).toBe(0)
    }
  })

  it('is never squarer than its least rounding, and a squarer ask is that', () => {
    const square = roundedMesh([0.3, 0.3, 0.3], 0, 24, 12)
    const least = roundedMesh([0.3, 0.3, 0.3], MIN_ROUND, 24, 12)
    expect(Array.from(square.positions)).toEqual(Array.from(least.positions))
  })

  it('draws nothing with no size on some axis', () => {
    for (const size of [[0, 0.2, 0.2], [0.2, -1, 0.2], [0.2, 0.2, NaN]] as Array<[number, number, number]>) expect(count(roundedMesh(size, 0.4, 24, 12))).toBe(0)
  })
})

describe('a tufted ball', () => {
  /** How far each vertex stands from the middle, as a share of the ball's own radius on its way out. */
  function reach(mesh: MeshData, axes: Vec3): number[] {
    return Array.from({ length: count(mesh) }, (_, i) => {
      const p = at(mesh.positions, i)
      return Math.hypot(p.x / axes[0], p.y / axes[1], p.z / axes[2])
    })
  }

  it('is a ball with tufts standing out of it, never in, at most its depth proud, continuous all round', () => {
    const { across, down } = tuftSegments(0.2, 40)
    const mesh = tuftedMesh(0.2, [1, 0.9, 1.1], 40, 0.12, across, down)
    const r = reach(mesh, [0.2, 0.18, 0.22])
    expect(Math.min(...r)).toBeGreaterThanOrEqual(1 - 1e-6)
    expect(Math.max(...r)).toBeLessThanOrEqual(1 + 0.12 * 1.6)
    // Tufts and the hollows between them: the surface really is lumpy.
    expect(Math.max(...r) - Math.min(...r)).toBeGreaterThan(0.06)
    expect(unitNormals(mesh)).toBe(true)
    expect(windsOutward(mesh)).toBe(true)
    expect(noSeam(mesh)).toBe(true)
    // The tufts' crests catch the edge light; nothing passes a full bevel's.
    expect(Math.max(...mesh.bevel)).toBeGreaterThan(0.3)
    expect(Math.max(...mesh.bevel)).toBeLessThanOrEqual(1)
  })

  it('is a plain ellipsoid with no depth to its tufts', () => {
    const mesh = tuftedMesh(0.2, [1, 1, 1], 30, 0, 24, 12)
    for (const d of reach(mesh, [0.2, 0.2, 0.2])) expect(d).toBeCloseTo(1, 6)
  })

  it('takes enough steps round to draw its tufts, more for more of them, within the kit’s limits', () => {
    expect(tuftSegments(0.2, 60).across).toBeGreaterThan(tuftSegments(0.2, 12).across)
    for (const n of [0, 12, 40, 500, NaN]) {
      const { across, down } = tuftSegments(0.2, n)
      expect(across % 4).toBe(0)
      expect(across).toBeLessThanOrEqual(64)
      expect(down).toBe(across / 2)
    }
  })
})

describe('brick courses', () => {
  const W = 0.8
  const H = 0.5
  const brick: [number, number] = [0.11, 0.045]
  const joint = 0.012
  const courses = brickCourses(W, H, brick, joint, 0.012, 3)
  /** Each brick's box, from its vertices: a brick is 10 triangles' worth of vertices in a row. */
  const boxes = courses.flatMap((mesh) =>
    Array.from({ length: count(mesh) / BRICK_VERTICES }, (_, b) => {
      const min = new Vector3(Infinity, Infinity, Infinity)
      const max = new Vector3(-Infinity, -Infinity, -Infinity)
      for (let i = b * BRICK_VERTICES; i < (b + 1) * BRICK_VERTICES; i++) {
        min.min(at(mesh.positions, i))
        max.max(at(mesh.positions, i))
      }
      return { min, max }
    }),
  )

  it('lays courses across the wall in a running bond, each brick inside it and standing proud of its face', () => {
    expect(courses).toHaveLength(3)
    const rows = Math.round(H / (brick[1] + joint))
    expect(new Set(boxes.map((b) => b.min.y.toFixed(4))).size).toBe(rows)
    for (const { min, max } of boxes) {
      // Within a float's rounding.
      expect(min.x).toBeGreaterThanOrEqual(-W / 2 - 1e-6)
      expect(max.x).toBeLessThanOrEqual(W / 2 + 1e-6)
      expect(min.y).toBeGreaterThanOrEqual(-H / 2 - 1e-6)
      expect(max.y).toBeLessThanOrEqual(H / 2 + 1e-6)
      expect(min.z).toBeCloseTo(0, 9)
      expect(max.z).toBeCloseTo(0.012, 9)
    }
    // Running bond: a course's joints fall at the middle of the bricks of the course below it.
    const starts = (y: string) => boxes.filter((b) => b.min.y.toFixed(4) === y).map((b) => b.min.x).sort((a, b) => a - b)
    const ys = [...new Set(boxes.map((b) => b.min.y.toFixed(4)))].sort((a, b) => +a - +b)
    const inner = (xs: number[]) => xs.filter((x) => x > -W / 2 + 1e-6)
    expect(Math.abs(inner(starts(ys[0]))[0] - inner(starts(ys[1]))[0])).toBeCloseTo((brick[0] + joint) / 2, 6)
  })

  it('leaves the joints open: no two bricks overlap, and the bricks cover most of the wall', () => {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]]
        const overlap = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 1e-6 && Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y) > 1e-6
        expect(overlap).toBe(false)
      }
    }
    const area = boxes.reduce((s, b) => s + (b.max.x - b.min.x) * (b.max.y - b.min.y), 0)
    expect(area / (W * H)).toBeGreaterThan(0.65)
    expect(area / (W * H)).toBeLessThan(0.95)
  })

  it('gives each brick a flat face and a bevelled rim catching the edge light, all facing out of the wall', () => {
    for (const mesh of courses) {
      expect(unitNormals(mesh)).toBe(true)
      for (let i = 0; i < count(mesh); i++) {
        const n = at(mesh.normals, i)
        expect(n.z).toBeGreaterThan(0.5)
        expect(mesh.bevel[i]).toBe(n.z > 0.999 ? 0 : 1)
      }
      const ids = Array.from(mesh.index!)
      for (let t = 0; t < ids.length; t += 3) {
        const [a, b, c] = [ids[t], ids[t + 1], ids[t + 2]].map((i) => at(mesh.positions, i))
        const face = b.clone().sub(a).cross(c.clone().sub(a))
        if (face.length() > 1e-12) expect(face.dot(at(mesh.normals, ids[t]))).toBeGreaterThan(0)
      }
    }
  })

  it('is the same wall every time, its bricks shared out between the shades', () => {
    const again = brickCourses(W, H, brick, joint, 0.012, 3)
    expect(again.map((m) => Array.from(m.positions))).toEqual(courses.map((m) => Array.from(m.positions)))
    for (const mesh of courses) expect(count(mesh)).toBeGreaterThan(0)
  })

  it('lays no brick wholly behind an opening, and keeps those it only partly covers', () => {
    const opening: [number, number, number, number] = [0.1, 0.05, 0.3, 0.2]
    const open = brickCourses(W, H, brick, joint, 0.012, 3, [opening, [NaN, NaN, NaN, NaN], [0, 0, -1, 1]])
    const laid = (meshes: MeshData[]) => meshes.reduce((s, m) => s + count(m), 0) / BRICK_VERTICES
    const inside = boxes.filter((b) => b.min.x >= -0.05 && b.max.x <= 0.25 && b.min.y >= -0.05 && b.max.y <= 0.15)
    expect(inside.length).toBeGreaterThan(0)
    expect(laid(open)).toBe(boxes.length - inside.length)
  })

  it('lays no bricks on a wall with no size, and never more than its limit', () => {
    for (const [w, h] of [[0, 0.5], [0.5, 0], [NaN, 0.5], [-1, 1]]) expect(brickCourses(w, h, brick, joint, 0.01, 2).every((m) => count(m) === 0)).toBe(true)
    const huge = brickCourses(100, 100, [0.001, 0.001], 0, 0.01, 2)
    expect(huge.reduce((s, m) => s + count(m), 0) / BRICK_VERTICES).toBeLessThanOrEqual(4000)
  })
})

/** The vertices of one brick: its face and four bevelled sides, each with its own. */
const BRICK_VERTICES = 20

describe('rain', () => {
  const mesh = rainMesh(80, 0.5, 1.2, 0.14, 7)

  it('is a column of streaks inside its radius, each one resting at the middle of its fall', () => {
    expect(count(mesh)).toBe(80 * 4)
    for (let i = 0; i < count(mesh); i++) {
      const p = at(mesh.positions, i)
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.5 + 1e-6)
      expect(p.y).toBeGreaterThanOrEqual(-0.6 - 0.07 - 1e-6)
      expect(p.y).toBeLessThanOrEqual(-0.6 + 0.07 + 1e-6)
    }
    // Falling, a streak moves at most this far either way from where it rests: it never leaves the column.
    expect(rainTravel(1.2, 0.14) / 2 + 0.07).toBeCloseTo(0.6, 9)
  })

  it('gives every corner of a streak its place across and along it, and every streak its own moment in the fall', () => {
    expect(mesh.corner.length).toBe(count(mesh) * 2)
    expect(mesh.phase.length).toBe(count(mesh))
    for (let s = 0; s < 80; s++) {
      const phases = new Set(Array.from(mesh.phase.slice(s * 4, s * 4 + 4)))
      expect(phases.size).toBe(1)
      const [phase] = phases
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(1)
      const corners = Array.from(mesh.corner.slice(s * 8, s * 8 + 8))
      expect(corners.sort()).toEqual([-1, -1, 0, 0, 1, 1, 1, 1].sort())
    }
    expect(new Set(Array.from(mesh.phase)).size).toBeGreaterThan(40)
  })

  it('is the same rain for the same seed, and none with no column to fall in', () => {
    expect(Array.from(rainMesh(80, 0.5, 1.2, 0.14, 7).positions)).toEqual(Array.from(mesh.positions))
    for (const [n, r, fall] of [[0, 0.5, 1], [10, 0, 1], [10, 0.5, 0], [NaN, 0.5, 1], [10, 0.5, 0.1]]) expect(count(rainMesh(n, r, fall, 0.14, 1))).toBe(0)
    expect(count(rainMesh(1e9, 0.5, 1, 0.1, 1)) / 4).toBe(RAIN.most)
  })
})

describe('a cloud of puffs', () => {
  it('fits its box, flat along its base, with every normal pointing out of its puff', () => {
    const mesh = puffCloudMesh(0.9, 0.35, 0.5)
    const { min, max } = bounds(mesh.positions)
    expect(min.x).toBeGreaterThanOrEqual(-0.45 - 1e-6)
    expect(max.x).toBeLessThanOrEqual(0.45 + 1e-6)
    expect(min.y).toBeGreaterThanOrEqual(-1e-6)
    expect(max.y).toBeLessThanOrEqual(0.35 + 1e-6)
    expect(min.z).toBeGreaterThanOrEqual(-0.25 - 1e-6)
    expect(max.z).toBeLessThanOrEqual(0.25 + 1e-6)
    expect(max.x - min.x).toBeGreaterThan(0.8)
    expect(max.y - min.y).toBeGreaterThan(0.3)
    expect(unitNormals(mesh)).toBe(true)
  })

  it('draws nothing with no size', () => {
    for (const s of [[0, 0.3, 0.3], [0.9, NaN, 0.3], [0.9, 0.3, -1]]) expect(count(puffCloudMesh(s[0], s[1], s[2]))).toBe(0)
  })
})
