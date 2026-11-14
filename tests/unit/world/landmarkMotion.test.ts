import { describe, expect, it } from 'vitest'
import { PULSES, acrossFor, landedOn, pulseStretch } from '@/lib/world/landmarkMotion'

describe('a landmark’s pulse', () => {
  it('is still at its start and from its end on', () => {
    for (const kind of ['hover', 'land'] as const) {
      expect(pulseStretch(kind, 0)).toBe(0)
      expect(pulseStretch(kind, PULSES[kind].ms)).toBe(0)
      expect(pulseStretch(kind, PULSES[kind].ms * 3)).toBe(0)
      expect(pulseStretch(kind, -10)).toBe(0)
      expect(pulseStretch(kind, Number.NaN)).toBe(0)
    }
  })

  it('lifts first when hovered, squashes first when landed on', () => {
    expect(pulseStretch('hover', PULSES.hover.ms * 0.1)).toBeGreaterThan(0)
    expect(pulseStretch('land', PULSES.land.ms * 0.1)).toBeLessThan(0)
  })

  it('stays slight, and dies away', () => {
    for (const kind of ['hover', 'land'] as const) {
      const { ms, amount } = PULSES[kind]
      let early = 0
      let late = 0
      for (let t = 0; t < ms; t += 5) {
        const s = Math.abs(pulseStretch(kind, t))
        expect(s).toBeLessThanOrEqual(Math.abs(amount))
        if (t < ms / 2) early = Math.max(early, s)
        else late = Math.max(late, s)
      }
      expect(late).toBeLessThan(early / 2)
    }
  })

  it('keeps the landmark’s volume: taller is thinner, squashed is wider', () => {
    expect(acrossFor(0)).toBe(1)
    expect(acrossFor(0.1)).toBeLessThan(1)
    expect(acrossFor(-0.1)).toBeGreaterThan(1)
    expect((1 + 0.1) * acrossFor(0.1) ** 2).toBeCloseTo(1, 10)
  })
})

describe('landing on a place', () => {
  it('is the moment the camera comes to rest at a place it was not at', () => {
    expect(landedOn({ mode: 'fly', target: 'beacon' }, { mode: 'focus', target: 'beacon' })).toBe('beacon')
    expect(landedOn({ mode: null, target: null }, { mode: 'focus', target: 'aura' })).toBe('aura')
    expect(landedOn({ mode: 'focus', target: 'beacon' }, { mode: 'focus', target: 'aura' })).toBe('aura')
  })

  it('is not staying at a place, flying, or the planet', () => {
    expect(landedOn({ mode: 'focus', target: 'beacon' }, { mode: 'focus', target: 'beacon' })).toBeNull()
    expect(landedOn({ mode: 'orbit', target: null }, { mode: 'fly', target: 'beacon' })).toBeNull()
    expect(landedOn({ mode: 'fly', target: null }, { mode: 'orbit', target: null })).toBeNull()
  })
})
