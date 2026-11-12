import { describe, it, expect } from 'vitest'
import { WORLD_SEED, mulberry32, noise3 } from '@/lib/world/rng'

describe('seeded randomness', () => {
  it('is the same sequence for the same seed', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('differs for a different seed', () => {
    expect(mulberry32(7)()).not.toBe(mulberry32(8)())
  })

  it('stays in range', () => {
    const r = mulberry32(WORLD_SEED)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('matches the look-test reference sequence for the world seed', () => {
    // Values produced by the `rng` function in planet-look-test.html with seed 20261110.
    const r = mulberry32(WORLD_SEED)
    expect([r(), r(), r()]).toEqual(REFERENCE_RNG)
  })

  it('noise is deterministic and bounded', () => {
    expect(noise3(1.3, 2.7, -4.1)).toBe(noise3(1.3, 2.7, -4.1))
    for (let i = 0; i < 200; i++) {
      expect(Math.abs(noise3(i * 0.37, i * 0.11, i * 0.73))).toBeLessThanOrEqual(1)
    }
  })

  it('matches the look-test reference noise', () => {
    // Values produced by the `noise` function in planet-look-test.html.
    REFERENCE_NOISE.forEach(([x, y, z, v]) => expect(noise3(x, y, z)).toBeCloseTo(v, 12))
  })
})

const REFERENCE_RNG = [0.47585524804890156, 0.4372278384398669, 0.7736968537792563]
const REFERENCE_NOISE: [number, number, number, number][] = [
  [1.3, 2.7, -4.1, 0.6258331227142069],
  [0, 0, 0, -1],
  [0.5, 0.5, 0.5, -0.2102502466946703],
  [10.25, -3.75, 8.1, -0.046069167564633084],
  [-2.2, 5.9, 0.3, -0.31730730373939664],
  [7.77, 7.77, 7.77, 0.45153929485078836],
]
