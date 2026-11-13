import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { BUG } from '@/content/eggs'
import { districts, places } from '@/content/world'
import { FIRM_GROUND } from '@/lib/world/characters'
import { angleDeg, dirOf } from '@/lib/world/geo'
import { footprintRadius } from '@/lib/world/kit'
import { MODEL_DEG, sceneryLayout } from '@/lib/world/scatter'
import { landValue } from '@/lib/world/terrain'
import { bugGround, bugPace, bugScale, bugSeed, pointAlong, spawnPoint, walkable, wander } from '@/lib/world/bug'

const ground = bugGround(districts, places)

describe('where the bug may walk', () => {
  it('is never the sea, nor the sand at its edge', () => {
    const sea = dirOf({ lat: 0, lon: -150 })
    expect(landValue(sea, districts).v).toBeLessThan(FIRM_GROUND)
    expect(walkable(sea, ground)).toBe(false)
  })

  it('is never on a landmark’s footprint, nor right beside it', () => {
    for (const place of places) {
      expect(walkable(dirOf(place.at), ground), place.id).toBe(false)
      // Just past the footprint's edge is still too close: its clearance keeps it off.
      const edge = (footprintRadius(place.id, places) + BUG.clearance * 0.5) * MODEL_DEG
      expect(walkable(dirOf({ lat: place.at.lat + edge, lon: place.at.lon }), ground), place.id).toBe(false)
    }
  })

  it('is never inside a tree or a building', () => {
    const { trees, buildings } = sceneryLayout(districts, places)
    for (const t of [...trees, ...buildings]) expect(walkable(t.dir, ground)).toBe(false)
  })
})

describe('a new bug', () => {
  it('appears on walkable ground, at the same place for the same seed and somewhere else for the next', () => {
    const a = spawnPoint(bugSeed(0), ground)!
    expect(walkable(a, ground)).toBe(true)
    expect(spawnPoint(bugSeed(0), ground)!.equals(a)).toBe(true)
    const b = spawnPoint(bugSeed(1), ground, { avoid: a })!
    expect(walkable(b, ground)).toBe(true)
    expect(angleDeg(a, b)).toBeGreaterThanOrEqual(BUG.hop)
  })

  it('keeps away from where the last one was caught, for many seeds', () => {
    for (let n = 0; n < 12; n++) {
      const caught = spawnPoint(bugSeed(n), ground)!
      const next = spawnPoint(bugSeed(n + 1), ground, { avoid: caught })!
      expect(angleDeg(caught, next)).toBeGreaterThanOrEqual(BUG.hop)
    }
  })

  it('for a test, stands on the walkable ground nearest the spot it is asked for', () => {
    const near = { lat: 4, lon: -20 }
    const at = spawnPoint(bugSeed(0), ground, { near })!
    expect(walkable(at, ground)).toBe(true)
    // No walkable spot on a fine grid is much nearer.
    let nearest = Infinity
    for (let lat = -40; lat <= 50; lat += 0.5)
      for (let lon = -70; lon <= 30; lon += 0.5) {
        const dir = dirOf({ lat, lon })
        if (walkable(dir, ground)) nearest = Math.min(nearest, angleDeg(dir, dirOf(near)))
      }
    expect(angleDeg(at, dirOf(near))).toBeLessThan(nearest + 2)
  })

  it('takes a whole number seed for any count, even a nonsense one', () => {
    for (const n of [-1, NaN, Infinity, 2.7]) expect(Number.isInteger(bugSeed(n))).toBe(true)
  })
})

describe('the bug’s walk', () => {
  it('passes only through walkable ground, a step at a time, the same way for the same seed', () => {
    for (let n = 0; n < 6; n++) {
      const start = spawnPoint(bugSeed(n), ground)!
      const leg = wander(bugSeed(n), ground, start, new Vector3(0, 1, 0))
      expect(leg.points).toHaveLength(BUG.legSteps + 1)
      for (const p of leg.points) expect(walkable(p, ground)).toBe(true)
      for (let i = 1; i < leg.points.length; i++) expect(angleDeg(leg.points[i - 1], leg.points[i])).toBeLessThanOrEqual(BUG.step + 1e-6)
      const again = wander(bugSeed(n), ground, start, new Vector3(0, 1, 0))
      expect(again.points.every((p, i) => p.equals(leg.points[i]))).toBe(true)
    }
  })

  it('wanders: it gets somewhere, mostly walking rather than standing', () => {
    const start = spawnPoint(bugSeed(3), ground)!
    const { points } = wander(bugSeed(3), ground, start, new Vector3(1, 0, 0))
    const moved = points.filter((p, i) => i > 0 && angleDeg(points[i - 1], p) > BUG.step / 2).length
    expect(moved / (points.length - 1)).toBeGreaterThan(0.8)
    const furthest = Math.max(...points.map((p) => angleDeg(start, p)))
    expect(furthest).toBeGreaterThan(3)
  })

  it('carries on where the last leg ended, facing the way it last faced', () => {
    const start = spawnPoint(bugSeed(2), ground)!
    const first = wander(bugSeed(2), ground, start, new Vector3(0, 0, 1), 60)
    const end = first.points[first.points.length - 1]
    expect(Math.abs(first.heading.dot(end))).toBeLessThan(1e-6)
    const second = wander(bugSeed(2) + 1, ground, end, first.heading, 60)
    expect(second.points[0].equals(end)).toBe(true)
  })

  it('moves smoothly between its points, and holds at either end', () => {
    const points = [dirOf({ lat: 0, lon: 0 }), dirOf({ lat: 0, lon: 1 }), dirOf({ lat: 0, lon: 2 })]
    expect(angleDeg(pointAlong(points, 0.5), dirOf({ lat: 0, lon: 0.5 }))).toBeLessThan(1e-3)
    expect(pointAlong(points, -3).equals(points[0])).toBe(true)
    expect(pointAlong(points, 99).equals(points[2])).toBe(true)
    expect(pointAlong(points, NaN).equals(points[0])).toBe(true)
  })
})

describe('the bug’s pace and size', () => {
  it('walks, eases to a stop, stands a moment, and sets off again', () => {
    expect(bugPace(0)).toBe(0)
    expect(bugPace(BUG.walk / 2)).toBe(1)
    expect(bugPace(BUG.walk + BUG.pause / 2)).toBe(0)
    expect(bugPace(BUG.walk + BUG.pause + BUG.walk / 2)).toBe(1)
    expect(bugPace(BUG.walk - 0.1)).toBeGreaterThan(0)
    expect(bugPace(BUG.walk - 0.1)).toBeLessThan(1)
    expect(bugPace(NaN)).toBe(0)
  })

  it('is its own size close to, and larger far out over the planet, never smaller', () => {
    expect(bugScale(1.2)).toBe(1)
    expect(bugScale(BUG.scaleTo + 3)).toBeCloseTo(BUG.farScale)
    const mid = bugScale((BUG.scaleFrom + BUG.scaleTo) / 2)
    expect(mid).toBeGreaterThan(1)
    expect(mid).toBeLessThan(BUG.farScale)
    expect(bugScale(NaN)).toBe(1)
  })
})

it('takes steps far smaller than a landmark’s footprint, so it never steps over one', () => {
  expect(BUG.step).toBeLessThan(MODEL_DEG)
})
