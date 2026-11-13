import { describe, it, expect } from 'vitest'
import { REST, gesturePose, type Move } from '@/lib/world/gesture'

const ALL: Move = { seconds: 1, beats: 2, lift: 0.03, rock: 0.08, bow: 0.1, turn: 0.2 }

describe('a gesture’s pose', () => {
  it.each([0, 1])('is at rest at its start and its end (%s), so it never jumps in or out of the still landmark', (t) => {
    const p = gesturePose(ALL, t)
    for (const v of Object.values(p)) expect(Math.abs(v)).toBeLessThan(1e-9)
  })

  it('is at rest before it starts, after it ends, and for anything that is not a moment in it', () => {
    for (const t of [-1, 2, Number.NaN, Number.POSITIVE_INFINITY]) expect(gesturePose(ALL, t)).toEqual(REST)
  })

  it('never goes further than the move says, and never down into the ground', () => {
    for (let k = 0; k <= 200; k++) {
      const p = gesturePose(ALL, k / 200)
      expect(p.lift).toBeGreaterThanOrEqual(0)
      expect(p.lift).toBeLessThanOrEqual(ALL.lift! + 1e-12)
      expect(Math.abs(p.rock)).toBeLessThanOrEqual(ALL.rock! + 1e-12)
      expect(Math.abs(p.bow)).toBeLessThanOrEqual(ALL.bow! + 1e-12)
      expect(Math.abs(p.turn)).toBeLessThanOrEqual(ALL.turn! + 1e-12)
    }
  })

  it('hops once a beat: up to its full height in the middle of each, down to the ground between them', () => {
    const hop: Move = { seconds: 1, beats: 2, lift: 0.04 }
    expect(gesturePose(hop, 0.25).lift).toBeCloseTo(0.04, 9)
    expect(gesturePose(hop, 0.5).lift).toBeCloseTo(0, 9)
    expect(gesturePose(hop, 0.75).lift).toBeCloseTo(0.04, 9)
  })

  it('rocks to one side and then the other within a beat', () => {
    const wiggle: Move = { seconds: 1, beats: 1, rock: 0.1 }
    expect(gesturePose(wiggle, 0.25).rock).toBeGreaterThan(0)
    expect(gesturePose(wiggle, 0.75).rock).toBeLessThan(0)
  })

  it('moves nothing the move does not name', () => {
    const p = gesturePose({ seconds: 1, beats: 1, lift: 0.02 }, 0.4)
    expect(p.rock).toBe(0)
    expect(p.bow).toBe(0)
    expect(p.turn).toBe(0)
  })
})
