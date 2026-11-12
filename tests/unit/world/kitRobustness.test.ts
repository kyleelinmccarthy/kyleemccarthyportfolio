import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { Batcher } from '@/components/world/models/kit'
import { places } from '@/content/world'
import { MODEL_SCALE } from '@/lib/world/camera'
import { angleDeg, dirOf } from '@/lib/world/geo'
import {
  FOOTPRINT,
  PLANET_TRIANGLE_BUDGET,
  TRIANGLE_BUDGET,
  blobSegments,
  blockMesh,
  roundSides,
  footprintRadius,
  footprintTable,
  peakMesh,
  roofMesh,
  SHADOW,
  shadowRadius,
  softProfile,
  triangleCount,
  tubeMesh,
  turnedMesh,
  type MeshData,
  type RoofStyle,
  type Vec3,
} from '@/lib/world/kit'

/**
 * A mesh is sound when every position and normal is finite, every normal is a
 * unit vector, and no triangle carries normals that face apart (pairwise dot
 * below zero): interpolating across one of those passes through zero, and
 * normalising zero is a NaN that the bloom spreads over the frame.
 */
function soundness(mesh: MeshData): string | null {
  for (const v of mesh.positions) if (!Number.isFinite(v)) return 'non-finite position'
  const count = mesh.positions.length / 3
  for (let i = 0; i < count; i++) {
    const l = Math.hypot(mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2])
    if (!(Math.abs(l - 1) < 0.01)) return `normal ${i} has length ${l}`
  }
  const n = (i: number) => new Vector3(mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2])
  const p = (i: number) => new Vector3(mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2])
  const ids = mesh.index ? Array.from(mesh.index) : Array.from({ length: count }, (_, i) => i)
  for (let t = 0; t < ids.length; t += 3) {
    // A triangle with no area draws no pixels, so its normals never reach a fragment (a hard edge's seam is one).
    const [pa, pb, pc] = [p(ids[t]), p(ids[t + 1]), p(ids[t + 2])]
    if (pb.clone().sub(pa).cross(pc.clone().sub(pa)).length() < 1e-12) continue
    const [a, b, c] = [n(ids[t]), n(ids[t + 1]), n(ids[t + 2])]
    const worst = Math.min(a.dot(b), b.dot(c), a.dot(c))
    if (worst < -1e-6) return `triangle ${t / 3} has normals facing apart (dot ${worst.toFixed(3)})`
  }
  return null
}

const bevels = [0, 0.0001, 0.03, 0.2, -1, NaN]

describe('every part survives every value its props can take', () => {
  it('a roof, of each style, at zero bevel, flat, thin or empty', () => {
    const sizes: Vec3[] = [[1, 0.4, 0.8], [1, 0, 0.8], [0, 0.4, 0.8], [1, 0.4, 0], [0, 0, 0], [1, 1e-5, 0.8], [1, NaN, 0.8]]
    for (const style of ['gable', 'hip', 'shed'] as RoofStyle[]) {
      for (const size of sizes) {
        for (const bevel of bevels) {
          for (const [overhang, fascia] of [[0.08, 0.06], [0, 0], [-0.5, 2]]) {
            const label = `${style} ${size} bevel ${bevel} overhang ${overhang} fascia ${fascia}`
            let mesh: MeshData | null = null
            expect(() => (mesh = roofMesh(style, size, overhang, fascia, bevel)), label).not.toThrow()
            expect(soundness(mesh!), label).toBeNull()
          }
        }
      }
    }
  })

  it('a gable roof at zero bevel has no edge whose normals face apart (the reviewer saw six)', () => {
    const mesh = roofMesh('gable', [1, 0.4, 0.84], 0.09, 0.06, 0)
    expect(mesh.positions.length).toBeGreaterThan(0)
    expect(soundness(mesh)).toBeNull()
  })

  it('a flat hipped roof (no rise) draws nothing rather than throwing', () => {
    const mesh = roofMesh('hip', [1, 0, 0.8], 0.08, 0.06, 0.03)
    expect(mesh.positions.length).toBe(0)
  })

  it('a tube or a peak, faceted or turned, at any size, side count or bevel', () => {
    for (const sides of [0, 1, 2, 3, 4, 6, 8, 9, 20, 2.5, NaN, -4, 1e6]) {
      for (const bevel of bevels) {
        for (const [top, bottom, height] of [[0.2, 0.3, 0.5], [0, 0.3, 0.5], [0.2, 0, 0.5], [0.2, 0.3, 0], [0, 0, 0.5], [0.5, 0.2, 0.01], [-1, 0.3, 0.5], [NaN, 0.3, 0.5]]) {
          const label = `tube ${top},${bottom},${height} sides ${sides} bevel ${bevel}`
          let mesh: MeshData | null = null
          expect(() => (mesh = tubeMesh(top, bottom, height, sides, bevel)), label).not.toThrow()
          expect(soundness(mesh!), label).toBeNull()
        }
        for (const [radius, height] of [[0.3, 0.6], [0, 0.6], [0.3, 0], [0.3, 0.001], [-1, 1], [NaN, 1]]) {
          const label = `peak ${radius},${height} sides ${sides} bevel ${bevel}`
          let mesh: MeshData | null = null
          expect(() => (mesh = peakMesh(radius, height, sides, bevel)), label).not.toThrow()
          expect(soundness(mesh!), label).toBeNull()
        }
      }
    }
  })

  it("a six-sided tower at the default bevel keeps every corner patch's normals together", () => {
    const mesh = tubeMesh(0.3, 0.3, 1, 6, 0.03)
    expect(soundness(mesh)).toBeNull()
  })

  it('a turned profile, however odd', () => {
    const profiles: Array<Array<[number, number]>> = [
      [[0, 0], [0.2, 0], [0.2, 0.3], [0, 0.3]],
      [[0, 0], [0.5, 0], [0.3, 0], [0.3, 1], [0, 1]], // doubles back on itself
      [[0, 0], [0, 0]],
      [[0, 0]],
      [],
      [[0, 0], [NaN, 0.3], [0, 1]],
      [[0, 0], [-0.2, 0.3], [0, 1]],
    ]
    for (const profile of profiles) {
      for (const sides of [3, 24, 0, NaN]) {
        for (const bevel of bevels) {
          const label = `turned ${JSON.stringify(profile)} sides ${sides} bevel ${bevel}`
          let mesh: MeshData | null = null
          expect(() => (mesh = turnedMesh(profile, sides, bevel)), label).not.toThrow()
          expect(soundness(mesh!), label).toBeNull()
        }
      }
    }
  })

  it('a block, at zero, negative or missing sizes and bevels', () => {
    const sizes: Vec3[] = [[1, 0.5, 0.25], [0, 1, 1], [1, 0, 1], [1, 1, 0], [-1, 1, 1], [NaN, 1, 1]]
    for (const size of sizes) {
      for (const bevel of bevels) {
        const label = `block ${size} bevel ${bevel}`
        let mesh: MeshData | null = null
        expect(() => (mesh = blockMesh(size, bevel)), label).not.toThrow()
        expect(soundness(mesh!), label).toBeNull()
      }
    }
  })
})

describe('soft profiles that double back', () => {
  it('give the point where they reverse a real normal, not zero', () => {
    const p = softProfile([[0, 0], [0.5, 0], [0.3, 0], [0.3, 1], [0, 1]], 0)
    for (const n of p.normals) expect(Math.hypot(n[0], n[1])).toBeCloseTo(1)
    const softened = softProfile([[0, 0], [0.5, 0], [0.3, 0], [0.3, 1], [0, 1]], 0.05)
    for (const n of softened.normals) expect(Math.hypot(n[0], n[1])).toBeCloseTo(1)
  })
})

describe("each place's footprint", () => {
  const distance = (a: string, b: string) => {
    const pa = places.find((p) => p.id === a)!
    const pb = places.find((p) => p.id === b)!
    return (angleDeg(dirOf(pa.at), dirOf(pb.at)) * Math.PI) / 180 / MODEL_SCALE
  }

  it('is the full 1.3 where there is room, and half the gap to the nearest neighbour where there is not', () => {
    // Home and the postbox are the closest pair: 11.48 degrees, so 1.14 each.
    expect(footprintRadius('home', places)).toBeCloseTo(distance('home', 'post') / 2, 5)
    expect(footprintRadius('home', places)).toBeLessThan(FOOTPRINT.radius)
    expect(footprintRadius('home', places)).toBeGreaterThan(1.1)
    for (const p of places) expect(footprintRadius(p.id, places)).toBeLessThanOrEqual(FOOTPRINT.radius)
    expect(places.some((p) => footprintRadius(p.id, places) === FOOTPRINT.radius)).toBe(true)
  })

  it('never overlaps a neighbour’s', () => {
    for (const a of places) {
      for (const b of places) {
        if (a === b) continue
        expect(footprintRadius(a.id, places) + footprintRadius(b.id, places), `${a.id}–${b.id}`).toBeLessThanOrEqual(distance(a.id, b.id) + 1e-9)
      }
    }
  })

  it("sizes the contact shadow inside it: a share by default, a model's own size if smaller, never more", () => {
    expect(shadowRadius(1.3)).toBeCloseTo(1.3 * SHADOW.share)
    expect(shadowRadius(1.14, 0.6)).toBe(0.6)
    expect(shadowRadius(1.14, 5)).toBe(1.14)
    expect(shadowRadius(1.14, NaN)).toBeCloseTo(1.14 * SHADOW.share)
    expect(shadowRadius(1.14, -1)).toBeCloseTo(1.14 * SHADOW.share)
  })

  it('is listed in the modelling README exactly as the helper computes it', () => {
    // Whatever line endings the checkout gave it (git turns them to CRLF on Windows).
    const readme = readFileSync(resolve(__dirname, '../../../components/world/models/README.md'), 'utf8').replace(/\r\n/g, '\n')
    const table = readme.split('<!-- footprints:start -->')[1]?.split('<!-- footprints:end -->')[0]?.trim()
    expect(table).toBe(footprintTable(places).trim())
  })
})

describe('the triangle budget', () => {
  it('is counted over what a landmark draws, outlines included, and the merged copies left out', () => {
    const root = new Group()
    const material = new MeshBasicMaterial()
    const box = new Mesh(new BoxGeometry(1, 1, 1), material) // 12 triangles
    box.add(new Mesh(new BoxGeometry(1, 1, 1), material)) // its outline: 12 more
    const merged = new Mesh(new BoxGeometry(1, 1, 1), material)
    merged.userData.batched = true
    root.add(box, merged, new Mesh(new SphereGeometry(1, 8, 6), material))
    expect(triangleCount(root)).toBe(12 + 12 + new SphereGeometry(1, 8, 6).index!.count / 3)
  })

  it('is a planet total for all nineteen landmarks, with a cap on any one', () => {
    expect(PLANET_TRIANGLE_BUDGET).toBe(380_000)
    expect(TRIANGLE_BUDGET).toBe(24_000)
    // The cap leaves room for one rich landmark without letting it take the planet's share of several.
    expect(TRIANGLE_BUDGET * 19).toBeGreaterThan(PLANET_TRIANGLE_BUDGET)
  })
})

describe('balls drawn at a detail that suits their size', () => {
  const triangles = ({ across, down }: { across: number; down: number }) => 2 * across * (down - 1)

  it('draws a small ball (a knob, a nose, a flower) at 8 by 8, 112 triangles', () => {
    for (const r of [0.004, 0.012, 0.02]) {
      expect(blobSegments(r)).toEqual({ across: 8, down: 8 })
      expect(triangles(blobSegments(r))).toBe(112)
    }
  })

  it('adds detail with size, up to the round parts’ own count, never fewer than 8 either way', () => {
    let last = blobSegments(0)
    for (let r = 0; r <= 0.6; r += 0.005) {
      const s = blobSegments(r)
      expect(s.across).toBeGreaterThanOrEqual(last.across)
      expect(s.across).toBeGreaterThanOrEqual(8)
      expect(s.down).toBeGreaterThanOrEqual(8)
      expect(s.across).toBeLessThanOrEqual(roundSides(r))
      last = s
    }
    // A big ball is as smooth as before.
    expect(blobSegments(0.45).across).toBe(roundSides(0.45))
    for (const bad of [NaN, -1, Infinity]) expect(blobSegments(bad)).toEqual({ across: 8, down: 8 })
  })
})

describe('batching follows its parts as they change', () => {
  const kitPart = (material: MeshBasicMaterial, x: number, size = 0.2) => {
    const mesh = new Mesh(new BoxGeometry(size, size, size), material)
    mesh.position.x = x
    mesh.userData.batch = true
    return mesh
  }
  const merged = (root: Group) => root.children.filter((c) => (c as Mesh).userData.batched) as Mesh[]
  const extent = (mesh: Mesh) => {
    mesh.geometry.computeBoundingBox()
    return mesh.geometry.boundingBox!
  }
  const flush = () => new Promise<void>((r) => queueMicrotask(r))

  it('draws a part added after mounting, and only once', async () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    root.add(kitPart(material, 0))
    const batcher = new Batcher(root)
    batcher.invalidate()
    await flush()
    expect(merged(root)).toHaveLength(1)
    expect(extent(merged(root)[0]).max.x).toBeCloseTo(0.1)

    const added = kitPart(material, 2)
    root.add(added)
    batcher.invalidate()
    await flush()
    expect(merged(root)).toHaveLength(1)
    expect(extent(merged(root)[0]).max.x).toBeCloseTo(2.1)
    expect(added.visible).toBe(false)
    batcher.dispose()
  })

  it('stops drawing a part that was removed', async () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    const keep = kitPart(material, 0)
    const gone = kitPart(material, 3)
    root.add(keep, gone)
    const batcher = new Batcher(root)
    batcher.invalidate()
    await flush()
    expect(extent(merged(root)[0]).max.x).toBeCloseTo(3.1)

    root.remove(gone)
    batcher.invalidate()
    await flush()
    expect(merged(root)).toHaveLength(1)
    expect(extent(merged(root)[0]).max.x).toBeCloseTo(0.1)
    expect(keep.visible).toBe(false)
    batcher.dispose()
  })

  it('draws a part’s new geometry or material, not the old', async () => {
    const red = new MeshBasicMaterial()
    const blue = new MeshBasicMaterial()
    const root = new Group()
    const part = kitPart(red, 0)
    root.add(part)
    const batcher = new Batcher(root)
    batcher.invalidate()
    await flush()

    part.geometry = new BoxGeometry(1, 1, 1)
    batcher.invalidate()
    await flush()
    expect(extent(merged(root)[0]).max.x).toBeCloseTo(0.5)

    part.material = blue
    batcher.invalidate()
    await flush()
    expect(merged(root)).toHaveLength(1)
    expect(merged(root)[0].material).toBe(blue)
    batcher.dispose()
  })

  it('does not redo the work when nothing changed', async () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    root.add(kitPart(material, 0))
    const batcher = new Batcher(root)
    batcher.invalidate()
    await flush()
    const first = merged(root)[0]
    batcher.invalidate()
    await flush()
    expect(merged(root)[0]).toBe(first)
    batcher.dispose()
    expect(merged(root)).toHaveLength(0)
  })
})
