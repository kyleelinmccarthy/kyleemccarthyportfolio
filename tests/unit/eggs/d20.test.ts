import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { DIE } from '@/content/eggs'
import { mulberry32 } from '@/lib/world/rng'
import { SIDES, d20Faces, dieFlight, faceOf, faceTone, riggedTo, rollD20, showing, tumble, tumbleAxis } from '@/lib/eggs/d20'

describe('rolling a d20', () => {
  it('gives every number from 1 to 20, about equally often', () => {
    const rand = mulberry32(42)
    const counts = new Array<number>(SIDES + 1).fill(0)
    const rolls = 40_000
    for (let i = 0; i < rolls; i++) counts[rollD20(rand)]++
    expect(counts[0]).toBe(0)
    for (let n = 1; n <= SIDES; n++) {
      // Each about a twentieth: within 10% of 2,000.
      expect(counts[n], String(n)).toBeGreaterThan((rolls / SIDES) * 0.9)
      expect(counts[n], String(n)).toBeLessThan((rolls / SIDES) * 1.1)
    }
  })

  it('takes its randomness from what it is handed, at both ends of it', () => {
    expect(rollD20(() => 0)).toBe(1)
    expect(rollD20(() => 0.999999)).toBe(20)
    expect(rollD20(() => 0.5)).toBe(11)
    // Nonsense from a broken source is held to a real roll.
    expect(rollD20(() => 1)).toBe(20)
    expect(rollD20(() => -3)).toBe(1)
    expect(rollD20(() => NaN)).toBe(1)
  })

  it('can be rigged to any number, for a test', () => {
    for (let n = 1; n <= SIDES; n++) expect(rollD20(riggedTo(n))).toBe(n)
    expect(rollD20(riggedTo(99))).toBe(20)
    expect(rollD20(riggedTo(-1))).toBe(1)
  })
})

describe('the die', () => {
  const faces = d20Faces()

  it('has twenty triangular faces, each number once, opposite faces adding up to 21', () => {
    expect(faces).toHaveLength(20)
    expect(faces.map((f) => f.value).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    for (const f of faces) {
      const opposite = faces.find((g) => g.normal.dot(f.normal) < -0.999)!
      expect(f.value + opposite.value).toBe(21)
      const [a, b, c] = f.corners
      expect(a.distanceTo(b)).toBeCloseTo(b.distanceTo(c), 9)
      expect(a.distanceTo(b)).toBeCloseTo(a.distanceTo(c), 9)
    }
  })

  it('lays every face out unmirrored: right, down and out make a right-handed frame, out pointing away from the middle', () => {
    for (const f of faces) {
      expect(new Vector3().crossVectors(f.right, f.down).dot(f.normal)).toBeCloseTo(1, 9)
      expect(f.normal.dot(f.centre)).toBeGreaterThan(0)
      // Its number's top is toward its top corner.
      expect(f.corners[0].clone().sub(f.centre).dot(f.down)).toBeLessThan(0)
    }
  })

  it('turns to show any number square to the visitor, upright', () => {
    for (let n = 1; n <= SIDES; n++) {
      const q = showing(n)
      const f = faceOf(n)
      expect(f.normal.clone().applyQuaternion(q).z).toBeCloseTo(1, 9)
      expect(f.down.clone().applyQuaternion(q).y).toBeCloseTo(1, 9)
    }
  })

  it('tumbles, and comes to rest showing its number', () => {
    const axis = tumbleAxis(mulberry32(7))
    expect(axis.length()).toBeCloseTo(1, 9)
    for (const n of [1, 14, 20]) {
      expect(tumble(1, n, axis, DIE.turns).angleTo(showing(n))).toBeLessThan(1e-9)
      expect(tumble(0, n, axis, DIE.turns).angleTo(showing(n))).toBeGreaterThan(0.1)
    }
  })

  it('flies in from off the left edge and settles where it is told, on the floor between bounces', () => {
    const view = { width: 1366, height: 768 }
    const tuning = { settle: DIE.settle, bounces: DIE.bounces, hop: DIE.hop, size: DIE.size }
    const start = dieFlight(0, view, tuning)
    expect(start.x).toBeLessThan(0)
    const end = dieFlight(1, view, tuning)
    expect(end.x).toBeCloseTo(view.width * DIE.settle.x)
    expect(end.y).toBeCloseTo(view.height * DIE.settle.y)
    // Never below the floor; up in the air partway through a hop.
    for (let t = 0; t <= 1; t += 0.01) expect(dieFlight(t, view, tuning).y).toBeLessThanOrEqual(end.y + 1e-9)
    expect(dieFlight(0.5 / DIE.bounces, view, tuning).y).toBeLessThan(end.y - 20)
  })

  it('lights its faces in three bands: toward the light in full, away from it in shade', () => {
    expect(faceTone(new Vector3(-0.45, -0.75, 0.55).normalize())).toBe('lit')
    expect(faceTone(new Vector3(0, 0, 1))).toBe('mid')
    expect(faceTone(new Vector3(0.45, 0.75, -0.55).normalize())).toBe('shade')
  })
})
