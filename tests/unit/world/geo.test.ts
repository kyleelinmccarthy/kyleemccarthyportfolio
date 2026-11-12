import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { angleDeg, dirOf, formatCoord, greatCircle, latLonOf, surfaceFrame } from '@/lib/world/geo'

describe('sphere geometry', () => {
  it('maps latitude and longitude onto the sphere, east to the right', () => {
    const o = dirOf({ lat: 0, lon: 0 })
    expect(o.x).toBeCloseTo(1)
    expect(o.y).toBeCloseTo(0)
    expect(o.z).toBeCloseTo(0)
    expect(dirOf({ lat: 90, lon: 0 }).y).toBeCloseTo(1)
    expect(dirOf({ lat: 0, lon: 90 }).z).toBeCloseTo(-1)
  })

  it('round-trips', () => {
    const p = latLonOf(dirOf({ lat: -31, lon: 160 }))
    expect(p.lat).toBeCloseTo(-31)
    expect(p.lon).toBeCloseTo(160)
  })

  it('returns longitude in (-180, 180]', () => {
    expect(latLonOf(dirOf({ lat: 10, lon: 180 })).lon).toBeCloseTo(180)
    expect(latLonOf(dirOf({ lat: 10, lon: -170 })).lon).toBeCloseTo(-170)
    expect(latLonOf(dirOf({ lat: 10, lon: 190 })).lon).toBeCloseTo(-170)
  })

  it('formats coordinates like a map', () => {
    expect(formatCoord({ lat: 33, lon: -40 })).toBe('33°N 040°W')
    expect(formatCoord({ lat: -5, lon: 74 })).toBe('5°S 074°E')
    expect(formatCoord({ lat: 0, lon: 0 })).toBe('0°N 000°E')
  })

  it('builds an orthonormal frame with south pointing down the globe', () => {
    const f = surfaceFrame(dirOf({ lat: 30, lon: 50 }))
    expect(f.up.dot(f.south)).toBeCloseTo(0)
    expect(f.up.dot(f.east)).toBeCloseTo(0)
    expect(f.south.dot(f.east)).toBeCloseTo(0)
    expect(f.south.length()).toBeCloseTo(1)
    expect(f.east.length()).toBeCloseTo(1)
    expect(f.south.y).toBeLessThan(0)
    expect(new Vector3().crossVectors(f.up, f.south).distanceTo(f.east)).toBeCloseTo(0)
  })

  it('walks the great circle', () => {
    const a = dirOf({ lat: 0, lon: 0 })
    const b = dirOf({ lat: 0, lon: 90 })
    expect(angleDeg(a, greatCircle(a, b, 0.5))).toBeCloseTo(45)
    expect(greatCircle(a, b, 0).distanceTo(a)).toBeCloseTo(0)
    expect(greatCircle(a, b, 1).distanceTo(b)).toBeCloseTo(0)
    expect(greatCircle(a, b, 0.5).length()).toBeCloseTo(1)
  })

  it('returns a copy of the start when both directions are the same', () => {
    const a = dirOf({ lat: 20, lon: 30 })
    const g = greatCircle(a, a.clone(), 0.5)
    expect(Number.isNaN(g.x) || Number.isNaN(g.y) || Number.isNaN(g.z)).toBe(false)
    expect(g.distanceTo(a)).toBeCloseTo(0)
    expect(g).not.toBe(a)
  })
})
