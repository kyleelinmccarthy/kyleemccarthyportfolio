import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { CLOTH, DIE, EMBLEM_LIFT, SNOW_PEAK, clothOffset, clothWave, dieMesh, emblemLift, emblemMesh, snowPeakMeshes, type MeshData, type Point2 } from '@/lib/world/kit'

/** The kit parts added for Home: a snow-capped peak, a twenty-sided die, and an emblem painted on a flag. */

/** Every triangle of a mesh: its corners, its normal by its winding, its middle, and its vertices' own normals. */
function triangles(m: MeshData) {
  const ids = m.index ? Array.from(m.index) : Array.from({ length: m.positions.length / 3 }, (_, i) => i)
  const v = (arr: Float32Array, i: number) => new Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
  const out: Array<{ corners: Vector3[]; normal: Vector3; middle: Vector3; normals: Vector3[]; area: number }> = []
  for (let t = 0; t < ids.length; t += 3) {
    const corners = [0, 1, 2].map((k) => v(m.positions, ids[t + k]))
    const cross = corners[1].clone().sub(corners[0]).cross(corners[2].clone().sub(corners[0]))
    out.push({
      corners,
      normal: cross.clone().normalize(),
      area: cross.length() / 2,
      middle: corners[0].clone().add(corners[1]).add(corners[2]).divideScalar(3),
      normals: [0, 1, 2].map((k) => v(m.normals, ids[t + k])),
    })
  }
  return out
}

/** The enclosed volume of a closed mesh (by the divergence theorem); positive when every face is wound outward. */
function volume(m: MeshData): number {
  return triangles(m).reduce((s, { corners: [a, b, c] }) => s + a.dot(b.clone().cross(c)) / 6, 0)
}

describe('a snow-capped peak', () => {
  const peak = snowPeakMeshes(0.8, 1.6, 10, 0.7, 1)

  it('stands on the ground and rises to its tip at `height`, never wider than `radius`', () => {
    const all = [...peak.rock.positions, ...peak.cap.positions]
    const ys = all.filter((_, i) => i % 3 === 1)
    expect(Math.min(...ys)).toBeCloseTo(0, 6)
    expect(Math.max(...ys)).toBeCloseTo(1.6, 6)
    for (let i = 0; i < all.length; i += 3) expect(Math.hypot(all[i], all[i + 2])).toBeLessThanOrEqual(0.8 + 1e-6)
  })

  it('is parted into rock below its snow line and a cap above it, the line jagged, the two together the whole', () => {
    const line = 0.7 * 1.6
    const rock = triangles(peak.rock)
    const cap = triangles(peak.cap)
    expect(rock.length).toBeGreaterThan(0)
    expect(cap.length).toBeGreaterThan(0)
    expect(rock.length + cap.length).toBe(triangles(peak.shell).length)
    // Every cap triangle above the line's lowest dip, every rock triangle below its highest point.
    const spacing = line / Math.max(1, Math.round(0.7 * SNOW_PEAK.rows))
    const jag = SNOW_PEAK.jag * spacing
    for (const t of cap) for (const c of t.corners) expect(c.y).toBeGreaterThanOrEqual(line - jag - 1e-6)
    for (const t of rock) for (const c of t.corners) expect(c.y).toBeLessThanOrEqual(line + jag + 1e-6)
    // Jagged: the cap's lowest corners are not all at one height.
    const lowest = new Set(cap.flatMap((t) => t.corners).filter((c) => c.y < line + jag + 1e-6).map((c) => c.y.toFixed(4)))
    expect(lowest.size).toBeGreaterThan(1)
  })

  it('is faceted, each face lit from its own flat normal, every face turned outward', () => {
    for (const t of [...triangles(peak.rock), ...triangles(peak.cap)]) {
      if (t.area < 1e-12) continue
      for (const n of t.normals) expect(n.dot(t.normal)).toBeCloseTo(1, 4)
    }
    const whole = { positions: new Float32Array([...peak.rock.positions, ...peak.cap.positions]), normals: new Float32Array(0), bevel: new Float32Array(0) }
    expect(volume(whole)).toBeGreaterThan(0)
    for (const t of triangles(whole)) {
      if (t.area < 1e-12) continue
      // Outward: away from the axis on the sides, down on the base.
      const out = t.middle.y < 1e-6 ? new Vector3(0, -1, 0) : new Vector3(t.middle.x, 0, t.middle.z)
      expect(t.normal.dot(out)).toBeGreaterThan(0)
    }
  })

  it('carries one shell with smooth normals for its line, its corners shared, so the line never cracks at a facet', () => {
    const { shell } = peak
    expect(shell.index).toBeDefined()
    const seen = new Set<string>()
    for (let i = 0; i < shell.positions.length; i += 3) {
      const key = [shell.positions[i], shell.positions[i + 1], shell.positions[i + 2]].map((x) => x.toFixed(5)).join()
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
    }
    expect(volume(shell)).toBeCloseTo(volume({ ...peak.rock, positions: new Float32Array([...peak.rock.positions, ...peak.cap.positions]), index: undefined }), 6)
  })

  it('is craggy and the same every time for one seed, and another seed makes another mountain', () => {
    expect(snowPeakMeshes(0.8, 1.6, 10, 0.7, 1).rock.positions).toEqual(peak.rock.positions)
    expect(snowPeakMeshes(0.8, 1.6, 10, 0.7, 2).rock.positions).not.toEqual(peak.rock.positions)
    // Not a plain cone: the rings' corners stand at different distances from the axis.
    const r = new Set<string>()
    for (let i = 0; i < peak.shell.positions.length; i += 3) {
      if (Math.abs(peak.shell.positions[i + 1]) > 1e-6) continue
      r.add(Math.hypot(peak.shell.positions[i], peak.shell.positions[i + 2]).toFixed(4))
    }
    expect(r.size).toBeGreaterThan(3)
  })

  it('draws all rock with no snow line, and nothing with no size', () => {
    const bare = snowPeakMeshes(0.8, 1.6, 10, 1, 1)
    expect(bare.cap.positions.length).toBe(0)
    expect(bare.rock.positions.length).toBeGreaterThan(0)
    for (const [r, h] of [[0, 1], [1, 0], [NaN, 1], [1, Infinity], [-1, 1]] as Point2[]) {
      const m = snowPeakMeshes(r, h, 10, 0.7, 1)
      expect(m.rock.positions.length + m.cap.positions.length + m.shell.positions.length).toBe(0)
    }
  })
})

describe('a twenty-sided die', () => {
  const die = dieMesh(0.12, 0.012)
  const faces = triangles(die).filter((t) => t.area > 1e-10)

  it('rests on one face on y = 0, its opposite face level on top, `radius` to its corners from its middle', () => {
    const ys = Array.from(die.positions).filter((_, i) => i % 3 === 1)
    expect(Math.min(...ys)).toBeCloseTo(0, 6)
    expect(Math.max(...ys)).toBeCloseTo(2 * DIE.inradius * 0.12, 6)
    const middle = new Vector3(0, DIE.inradius * 0.12, 0)
    for (let i = 0; i < die.positions.length; i += 3) expect(new Vector3(die.positions[i], die.positions[i + 1], die.positions[i + 2]).distanceTo(middle)).toBeLessThanOrEqual(0.12 + 1e-6)
    expect(faces.some((t) => t.normal.y < -0.9999)).toBe(true)
    expect(faces.some((t) => t.normal.y > 0.9999)).toBe(true)
  })

  it('has twenty flat faces and bevelled edges and corners between them, every face turned outward', () => {
    // The faces: the flat triangles not marked as bevel, each square to its own direction.
    const flat = new Set<string>()
    const ids = die.index ? Array.from(die.index) : []
    for (let t = 0; t < ids.length; t += 3) {
      if ([0, 1, 2].some((k) => die.bevel[ids[t + k]] > 0)) continue
      const n = triangles({ ...die, index: new Uint32Array(ids.slice(t, t + 3)) })[0].normal
      flat.add(n.toArray().map((x) => x.toFixed(3)).join())
    }
    expect(flat.size).toBe(20)
    expect(Array.from(die.bevel).some((b) => b > 0)).toBe(true)
    expect(volume(die)).toBeGreaterThan(0)
    const middle = new Vector3(0, DIE.inradius * 0.12, 0)
    for (const t of faces) expect(t.normal.dot(t.middle.clone().sub(middle))).toBeGreaterThan(0)
    // Its normals turn smoothly across each bevel: no triangle's corners face apart.
    for (const t of faces) for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) expect(t.normals[a].dot(t.normals[b])).toBeGreaterThan(0)
  })

  it('keeps its bevel small, and draws nothing with no size', () => {
    expect(dieMesh(0.12, 5).positions.length).toBe(die.positions.length)
    for (const r of [0, -1, NaN, Infinity]) expect(dieMesh(r, 0.01).positions.length).toBe(0)
    for (const b of [0, -1, NaN, 9]) {
      const m = dieMesh(0.12, b)
      expect(Array.from(m.positions).every(Number.isFinite)).toBe(true)
      expect(volume(m)).toBeGreaterThan(0)
    }
  })
})

describe('an emblem on a flag', () => {
  const W = 0.36
  const H = 0.24
  const square: Point2[] = [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]]

  it('stands on both faces of the cloth, a hair proud of each, round the cloth’s middle', () => {
    const m = emblemMesh([square], W, H)
    const front = triangles(m).filter((t) => t.normal.z > 0.99)
    const back = triangles(m).filter((t) => t.normal.z < -0.99)
    expect(front.length).toBeGreaterThan(0)
    expect(back.length).toBe(front.length)
    for (const t of front) for (const c of t.corners) expect(c.z).toBeGreaterThan(CLOTH.thickness / 2)
    for (const t of back) for (const c of t.corners) expect(c.z).toBeLessThan(-CLOTH.thickness / 2)
    for (const t of [...front, ...back]) for (const n of t.normals) expect(Math.abs(n.z)).toBeCloseTo(1, 6)
    const area = front.reduce((s, t) => s + t.area, 0)
    expect(area).toBeCloseTo(0.01, 6)
    // Round the cloth's middle: its hoist at x = 0, hanging from y = 0.
    const xs = front.flatMap((t) => t.corners.map((c) => c.x))
    const ys = front.flatMap((t) => t.corners.map((c) => c.y))
    expect(Math.min(...xs)).toBeCloseTo(W / 2 - 0.05, 6)
    expect(Math.max(...xs)).toBeCloseTo(W / 2 + 0.05, 6)
    expect(Math.min(...ys)).toBeCloseTo(-H / 2 - 0.05, 6)
    expect(Math.max(...ys)).toBeCloseTo(-H / 2 + 0.05, 6)
  })

  it('is cut fine along the cloth, so it ripples with it and never dips into it', () => {
    const m = emblemMesh([square], W, H)
    for (const t of triangles(m)) {
      const xs = t.corners.map((c) => c.x)
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(W / CLOTH.columns + 1e-6)
    }
  })

  it('takes several pieces, each fanned from its own middle, either winding', () => {
    const one = triangles(emblemMesh([square], W, H)).length
    const reversed = [...square].reverse()
    expect(triangles(emblemMesh([square, reversed.map(([x, y]) => [x + 0.06, y] as Point2)], W, H)).length).toBe(2 * one)
    for (const t of triangles(emblemMesh([reversed], W, H))) expect(Math.abs(t.normal.z)).toBeCloseTo(1, 6)
  })

  it('is held to the cloth, and draws nothing for no pieces, a piece with no area or a cloth with no size', () => {
    const big: Point2[] = [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]
    for (const t of triangles(emblemMesh([big], W, H))) {
      for (const c of t.corners) {
        expect(c.x).toBeGreaterThanOrEqual(-1e-6)
        expect(c.x).toBeLessThanOrEqual(W + 1e-6)
        expect(c.y).toBeLessThanOrEqual(1e-6)
        expect(c.y).toBeGreaterThanOrEqual(-H - 1e-6)
      }
    }
    expect(emblemMesh([], W, H).positions.length).toBe(0)
    expect(emblemMesh([[[0, 0], [0.1, 0], [0.2, 0]]], W, H).positions.length).toBe(0)
    expect(emblemMesh([square], 0, H).positions.length).toBe(0)
    expect(emblemMesh([square], W, NaN).positions.length).toBe(0)
    expect(Array.from(emblemMesh([[[NaN, 0], [0.1, 0], [0, 0.1]]], W, H).positions).every(Number.isFinite)).toBe(true)
  })

  it('stands proud of its cloth by more than the cloth, cut in straight columns, falls short of the ripple, at the deepest wave on a wide flag', () => {
    for (const width of [0.36, 1, 2]) {
      const wave = clothWave(width, CLOTH.maxAmount, 1)
      const column = width / CLOTH.columns
      // Where the cloth's straight columns fall furthest inside the true ripple the finer-cut emblem follows, over a run of times.
      let sag = 0
      for (let t = 0; t < 6; t += 0.05) {
        for (let c = 0; c < CLOTH.columns; c++) {
          for (const f of [0.25, 0.5, 0.75]) {
            const chord = clothOffset(c * column, t, wave) * (1 - f) + clothOffset((c + 1) * column, t, wave) * f
            sag = Math.max(sag, Math.abs(clothOffset((c + f) * column, t, wave) - chord))
          }
        }
      }
      expect(sag, `width ${width}`).toBeGreaterThan(0)
      expect(emblemLift(wave.amplitude) - EMBLEM_LIFT, `width ${width}`).toBeGreaterThanOrEqual(sag)
      // And the emblem is laid that far out.
      const z = Math.max(...Array.from(emblemMesh([square], width, H, emblemLift(wave.amplitude)).positions).filter((_, i) => i % 3 === 2))
      expect(z).toBeCloseTo(CLOTH.thickness / 2 + emblemLift(wave.amplitude), 6)
    }
    // A still flag keeps the plain hair's lift; a lift that is not a number falls back to it.
    expect(emblemLift(0)).toBe(EMBLEM_LIFT)
    expect(emblemLift(NaN)).toBe(EMBLEM_LIFT)
  })
})
