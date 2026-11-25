import { describe, it, expect } from 'vitest'
import { DRAGON } from '@/content/eggs'
import { districts, places } from '@/content/world'
import { FIRM_GROUND } from '@/lib/world/characters'
import { DRAGON_SEED, dragonAt, dragonBank, dragonHold, dragonRadius, dragonWing } from '@/lib/world/dragon'
import { angleDeg, dirOf } from '@/lib/world/geo'
import { ORBIT_NEAREST } from '@/lib/world/gestures'
import { landmarkTop } from '@/lib/world/labels'
import { landValue } from '@/lib/world/terrain'

describe('the dragon die’s flight', () => {
  it('flies clear of every landmark’s top, and inside the nearest the camera may come', () => {
    const r = dragonRadius(places, districts)
    for (const p of places) expect(r - landmarkTop(p, districts).length(), p.id).toBeGreaterThanOrEqual(DRAGON.above - 1e-9)
    for (let t = 0; t < 120; t += 0.5) {
      const { at } = dragonAt(DRAGON_SEED, t, r)
      expect(at.length()).toBeGreaterThan(r - DRAGON.bob - 1e-6)
      expect(at.length()).toBeLessThan(ORBIT_NEAREST - 0.1)
    }
  })

  it('is the same for the same seed and time, and moves smoothly at its speed', () => {
    const r = dragonRadius(places, districts)
    expect(dragonAt(DRAGON_SEED, 12.3, r).at.toArray()).toEqual(dragonAt(DRAGON_SEED, 12.3, r).at.toArray())
    const a = dragonAt(DRAGON_SEED, 10, r).at.clone().normalize()
    const b = dragonAt(DRAGON_SEED, 11, r).at.clone().normalize()
    expect(angleDeg(a, b)).toBeGreaterThan(DRAGON.speed * 0.6)
    expect(angleDeg(a, b)).toBeLessThan(DRAGON.speed * 1.6)
  })

  it('faces the way it flies, flat to the ground under it', () => {
    const r = dragonRadius(places, districts)
    const { at, ahead } = dragonAt(DRAGON_SEED, 30, r)
    const next = dragonAt(DRAGON_SEED, 30.2, r).at
    expect(Math.abs(ahead.dot(at.clone().normalize()))).toBeLessThan(1e-3)
    expect(next.clone().sub(at).dot(ahead)).toBeGreaterThan(0)
  })

  it('banks no further than its most', () => {
    for (let t = 0; t < 200; t += 1.7) expect(Math.abs(dragonBank(DRAGON_SEED, t))).toBeLessThanOrEqual(DRAGON.bank + 1e-9)
  })

  it('flaps, then glides with its wings held at their tilt', () => {
    const glideMid = DRAGON.flap + DRAGON.glide / 2
    expect(dragonWing(glideMid)).toBeCloseTo(DRAGON.open, 6)
    // Read at an uneven step, so the readings never fall in step with the beat.
    const beatsSeen = new Set(Array.from({ length: 20 }, (_, i) => Math.round(dragonWing(0.3 + i * 0.037) * 100)))
    expect(beatsSeen.size).toBeGreaterThan(5)
  })

  it('holds, under reduced motion, over firm land well clear of every place', () => {
    const hold = dragonHold(places, districts)
    for (const p of places) expect(angleDeg(hold, dirOf(p.at)), p.id).toBeGreaterThanOrEqual(DRAGON.holdClear)
    expect(landValue(hold, districts).v).toBeGreaterThanOrEqual(FIRM_GROUND)
  })
})
