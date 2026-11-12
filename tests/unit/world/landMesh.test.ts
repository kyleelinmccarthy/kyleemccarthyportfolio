import { describe, it, expect } from 'vitest'
import { Color, IcosahedronGeometry, Vector3 } from 'three'
import { districts, places } from '@/content/world'
import { dirOf } from '@/lib/world/geo'
import { heightAt, landValue } from '@/lib/world/terrain'
import { buildLand, indexDirections, landColor, landRadius, shoreValues } from '@/lib/world/landMesh'

describe('landMesh', () => {
  it('lifts land above the sea and sinks the sea floor below it', () => {
    for (const p of places) expect(landRadius(dirOf(p.at), districts), p.id).toBeGreaterThan(1.01)
    const sea = landRadius(dirOf({ lat: 0, lon: 25 }), districts)
    expect(sea).toBeLessThan(1)
    expect(sea).toBeGreaterThanOrEqual(0.946)
  })

  it('sits a landmark exactly on the ground', () => {
    for (const p of places) expect(landRadius(dirOf(p.at), districts), p.id).toBeCloseTo(1 + heightAt(dirOf(p.at), districts), 6)
  })

  it('paints the middle of every island green', () => {
    for (const d of districts) {
      const c = landColor(dirOf(d.center), districts, new Color())
      expect(c.g, d.id).toBeGreaterThan(c.r)
      expect(c.g, d.id).toBeGreaterThan(c.b)
    }
  })

  it('paints the sea floor sand', () => {
    const c = landColor(dirOf({ lat: 0, lon: 25 }), districts, new Color())
    // Sand is warm: more red than green, more green than blue.
    expect(c.r).toBeGreaterThan(c.g)
    expect(c.g).toBeGreaterThan(c.b)
  })

  it('builds a radius and a colour for every direction it is given', () => {
    const dirs = [dirOf(places[0].at), dirOf({ lat: 0, lon: 25 }), dirOf(districts[1].center)]
    const directions = new Float32Array(dirs.flatMap((d) => [d.x, d.y, d.z]))
    const { positions, colors } = buildLand(directions, districts)
    expect(positions).toHaveLength(9)
    expect(colors).toHaveLength(9)
    const out = new Color()
    dirs.forEach((d, i) => {
      // Each position is the direction pushed out to the land's radius there (to float precision).
      const dir = d.clone().set(directions[i * 3], directions[i * 3 + 1], directions[i * 3 + 2])
      const r = landRadius(dir, districts)
      expect(positions[i * 3]).toBeCloseTo(dir.x * r, 6)
      expect(positions[i * 3 + 1]).toBeCloseTo(dir.y * r, 6)
      expect(positions[i * 3 + 2]).toBeCloseTo(dir.z * r, 6)
      landColor(dir, districts, out)
      expect(colors[i * 3]).toBeCloseTo(out.r, 6)
      expect(colors[i * 3 + 1]).toBeCloseTo(out.g, 6)
      expect(colors[i * 3 + 2]).toBeCloseTo(out.b, 6)
    })
  })

  it('evaluates each direction of a sphere once, and rebuilds every triangle from the unique ones', () => {
    const detail = 3
    const sphere = new IcosahedronGeometry(1, detail).getAttribute('position').array as Float32Array
    const { directions, index } = indexDirections(sphere)
    // A subdivided icosahedron has 10(n + 1)^2 + 2 distinct vertices.
    expect(directions.length / 3).toBe(10 * (detail + 1) ** 2 + 2)
    expect(index).toHaveLength(sphere.length / 3)
    for (let i = 0; i < index.length; i++)
      for (let k = 0; k < 3; k++) expect(Math.abs(directions[index[i] * 3 + k] - sphere[i * 3 + k]), `vertex ${i}`).toBeLessThan(1e-4)
  })

  it('gives the sea the land value under each direction', () => {
    const dirs = [dirOf(places[0].at), dirOf({ lat: 0, lon: 25 }), dirOf(districts[2].center)]
    const values = shoreValues(new Float32Array(dirs.flatMap((d) => [d.x, d.y, d.z])), districts)
    expect(values).toHaveLength(3)
    dirs.forEach((d, i) => {
      const dir = new Vector3(Math.fround(d.x), Math.fround(d.y), Math.fround(d.z))
      expect(values[i]).toBeCloseTo(landValue(dir, districts).v, 5)
    })
  })
})
