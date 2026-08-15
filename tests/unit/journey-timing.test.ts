import { describe, it, expect } from 'vitest'
import {
  FIRST_HOLD,
  HOLD,
  VH_PER_SCENE,
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
