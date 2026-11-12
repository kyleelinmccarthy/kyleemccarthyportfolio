import { describe, it, expect } from 'vitest'
import { districts, places } from '@/content/world'
import { angleDeg, dirOf } from '@/lib/world/geo'
import { SHORE, heightAt, isLand, landValue } from '@/lib/world/terrain'

describe('terrain', () => {
  it('puts every district centre on land', () => {
    for (const d of districts) expect(isLand(dirOf(d.center), districts), d.id).toBe(true)
  })

  it('puts every place on land, clear of the shore', () => {
    for (const p of places) expect(landValue(dirOf(p.at), districts).v, p.id).toBeGreaterThanOrEqual(SHORE + 0.04)
  })

  it('assigns each place to its own district’s island', () => {
    for (const p of places) expect(landValue(dirOf(p.at), districts).district, p.id).toBe(p.district)
  })

  it('keeps places from crowding each other', () => {
    for (const a of places)
      for (const b of places)
        if (a.id < b.id) expect(angleDeg(dirOf(a.at), dirOf(b.at)), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(9)
  })

  it('is sea between the islands and flat at sea level there', () => {
    const mid = dirOf({ lat: 0, lon: 25 })
    expect(isLand(mid, districts)).toBe(false)
    expect(heightAt(mid, districts)).toBe(0)
  })

  it('raises land between 0.012 and 0.032', () => {
    for (const p of places) {
      const h = heightAt(dirOf(p.at), districts)
      expect(h, p.id).toBeGreaterThanOrEqual(0.012)
      expect(h, p.id).toBeLessThanOrEqual(0.032)
    }
  })

  it('treats the shore value as land and anything below it as sea', () => {
    const c = dirOf(districts[0].center)
    expect(landValue(c, districts).v).toBeGreaterThan(SHORE)
    expect(heightAt(c, districts)).toBeGreaterThanOrEqual(0.012)
  })
})
