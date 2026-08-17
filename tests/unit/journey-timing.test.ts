import { describe, it, expect } from 'vitest'
import {
  FIRST_HOLD,
  HOLD,
  MOVE_UNITS,
  VH_PER_SCENE,
  dwellEnd,
  holdFor,
  leadInVh,
} from '@/components/journey/timing'

describe('journey camera timing', () => {
  it('starts the camera within half a viewport of scrolling', () => {
    // The bug this guards: at 240vh / HOLD 0.48 the lead-in was 115vh, so the
    // reader scrolled past a full screen with nothing moving and assumed the
    // page was stuck.
    expect(leadInVh()).toBeLessThanOrEqual(50)
  })

  it('gives the opening scene a shorter dwell than scenes you arrive at', () => {
    expect(holdFor(0)).toBe(FIRST_HOLD)
    expect(holdFor(1)).toBe(HOLD)
    expect(holdFor(4)).toBe(HOLD)
    expect(FIRST_HOLD).toBeLessThan(HOLD)
  })

  it('keeps every dwell a real pause, not a jump cut', () => {
    // A hold of 0 would swap scenes the instant you touch the wheel.
    expect(FIRST_HOLD).toBeGreaterThan(0.1)
    // A hold at or past 1 would consume the scene's whole scroll segment and
    // leave no distance for the camera move itself.
    expect(HOLD).toBeLessThan(1)
  })

  it('leaves enough scroll per scene to read it', () => {
    expect(VH_PER_SCENE).toBeGreaterThanOrEqual(150)
  })
})

describe('weighted rooms', () => {
  // A five-room track where the gallery claims four units: weights 1,1,4,1,1,
  // so one unit is 1/8 of the whole track.
  const unit = 1 / 8
  const heavyStart = 2 * unit
  const heavySpan = 4 * unit

  it('costs the same scroll to walk out of a heavy room as a light one', () => {
    // The bug: the camera move used to be a share of the room you were
    // leaving, so the gallery spent over two viewports sliding sideways while
    // its pieces were still advancing — walking the wall and travelling to the
    // next room happened at once and fought each other.
    const lightMove = unit + unit - dwellEnd(1, unit, unit, unit)
    const heavyMove = heavyStart + heavySpan - dwellEnd(2, heavyStart, heavySpan, unit)
    expect(heavyMove).toBeCloseTo(lightMove, 10)
    expect(heavyMove).toBeCloseTo(MOVE_UNITS * unit, 10)
  })

  it('spends a heavy room’s extra weight standing still', () => {
    const lightDwell = dwellEnd(1, unit, unit, unit) - unit
    const heavyDwell = dwellEnd(2, heavyStart, heavySpan, unit) - heavyStart
    // Three extra units of weight, all of it dwell.
    expect(heavyDwell - lightDwell).toBeCloseTo(3 * unit, 10)
  })

  it('leaves a weight-1 room’s timing exactly as it was', () => {
    expect(dwellEnd(1, unit, unit, unit)).toBeCloseTo(unit + HOLD * unit, 10)
  })

  it('keeps the opening room’s short lead-in', () => {
    expect(dwellEnd(0, 0, unit, unit)).toBeCloseTo(FIRST_HOLD * unit, 10)
  })
})
