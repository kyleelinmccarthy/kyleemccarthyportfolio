import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { looks } from '@/content/sky'
import { CAMERA_FOV, overviewDistance } from '@/lib/world/camera'
import { SUN_DISC, easeAmount, easeLook, keyLight, lookColorKeys, lookNumberKeys, sunPlacement, toLookState } from '@/lib/world/look'

describe('the sun and the moon on the screen', () => {
  /** The disc as the shader draws it, in CSS pixels from the top left. */
  const disc = (width: number, height: number, sunY: number, placeOpen = false) => {
    const s = sunPlacement({ width, height, placeOpen, sunY })
    const r = SUN_DISC * s.size * height
    const x = s.x * width
    const y = (1 - s.y) * height
    return { left: x - r, right: x + r, top: y - r, bottom: y + r, r }
  }
  /** The planet at the overview, as a circle on the screen: its radius with the glow round it. */
  const planet = (width: number, height: number) => {
    const d = overviewDistance(width / height)
    const r = (Math.tan(Math.asin(1.12 / d)) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)) * (height / 2)
    return { x: width / 2, y: height / 2, r }
  }
  /** The name, role line, headline and greeting on a phone's home page (Header: 26px in, at most 250 wide), measured at 412 x 915. */
  const header = { left: 26, top: 26, right: 276, bottom: 200 }
  const sunYs = Object.values(looks).map((l) => l.sunY)

  it('leaves the desktop sky as it was: right of centre, at the look’s height, full size', () => {
    expect(sunPlacement({ width: 1440, height: 900, placeOpen: false, sunY: 0.8 })).toEqual({ x: 0.8, y: 0.8, size: 1 })
    expect(sunPlacement({ width: 1440, height: 900, placeOpen: true, sunY: 0.58 })).toEqual({ x: 0.56, y: 0.58, size: 1 })
  })

  it.each([
    [412, 915],
    [320, 900],
  ])('on a %i x %i phone, sits wholly on screen, clear of the header and of the planet, by day and by night', (width, height) => {
    for (const sunY of sunYs) {
      const d = disc(width, height, sunY)
      expect(d.left).toBeGreaterThan(0)
      expect(d.right).toBeLessThan(width)
      expect(d.top).toBeGreaterThan(0)
      expect(d.bottom).toBeLessThan(height)
      const clearOfHeader = d.top > header.bottom || d.left > header.right
      expect(clearOfHeader, `sunY ${sunY}`).toBe(true)
      const p = planet(width, height)
      expect(Math.hypot(p.x - (d.left + d.r), p.y - (d.top + d.r))).toBeGreaterThan(p.r + d.r)
    }
  })

  it('keeps its desktop size beside the planet on a phone', () => {
    const ratio = (w: number, h: number) => disc(w, h, 0.8).r / planet(w, h).r
    const desktop = ratio(1440, 900)
    expect(ratio(412, 915) / desktop).toBeGreaterThan(0.75)
    expect(ratio(412, 915) / desktop).toBeLessThan(1.25)
  })

  it('copes with a window of no size', () => {
    const s = sunPlacement({ width: 0, height: 0, placeOpen: false, sunY: 0.8 })
    for (const n of [s.x, s.y, s.size]) expect(Number.isFinite(n)).toBe(true)
    expect(s.size).toBeGreaterThan(0)
  })
})

describe('toLookState', () => {
  it('carries every colour and number of the look', () => {
    const state = toLookState(looks.evening)
    for (const key of lookColorKeys) expect(state.colors[key].getHexString(), key).toBe(new Color(looks.evening[key]).getHexString())
    for (const key of lookNumberKeys) expect(state.numbers[key], key).toBe(looks.evening[key])
  })

  it('keeps the hex values it was given once converted back for display', () => {
    expect(`#${toLookState(looks.morning).colors.top.getHexString().toUpperCase()}`).toBe(looks.morning.top)
  })

  it('gives each state its own colours, so easing one never moves another', () => {
    const a = toLookState(looks.afternoon)
    const b = toLookState(looks.afternoon)
    a.colors.top.set('#000000')
    expect(b.colors.top.getHex()).toBe(new Color(looks.afternoon.top).getHex())
  })
})

describe('easeLook', () => {
  it('eases every colour and number toward the goal', () => {
    const a = toLookState(looks.afternoon), b = toLookState(looks.night), before = a.colors.top.getHex()
    easeLook(a, b, 0)
    expect(a.colors.top.getHex()).toBe(before)
    easeLook(a, b, 1)
    expect(a.colors.top.getHex()).toBe(b.colors.top.getHex())
    expect(a.numbers.star).toBe(1)
  })

  it('arrives exactly on every key at k = 1', () => {
    const a = toLookState(looks.morning), b = toLookState(looks.evening)
    easeLook(a, b, 1)
    for (const key of lookColorKeys) expect(a.colors[key].equals(b.colors[key]), key).toBe(true)
    for (const key of lookNumberKeys) expect(a.numbers[key], key).toBe(b.numbers[key])
  })

  it('moves part of the way for a fraction', () => {
    const a = toLookState(looks.afternoon), b = toLookState(looks.night)
    const start = a.colors.mid.r
    easeLook(a, b, 0.5)
    expect(a.colors.mid.r).toBeCloseTo((start + b.colors.mid.r) / 2, 6)
    expect(a.numbers.glow).toBeCloseTo((looks.afternoon.glow + looks.night.glow) / 2, 6)
  })

  it('leaves the goal alone', () => {
    const a = toLookState(looks.afternoon), b = toLookState(looks.night)
    easeLook(a, b, 0.5)
    expect(b.colors.top.getHex()).toBe(new Color(looks.night.top).getHex())
    expect(b.numbers.star).toBe(looks.night.star)
  })
})

describe('easeAmount', () => {
  it('is nothing for no time and approaches all of it over a few seconds', () => {
    expect(easeAmount(0)).toBe(0)
    expect(easeAmount(1 / 60)).toBeGreaterThan(0)
    expect(easeAmount(1 / 60)).toBeLessThan(0.1)
    expect(easeAmount(3)).toBeGreaterThan(0.99)
    expect(easeAmount(3)).toBeLessThanOrEqual(1)
  })
})

describe('keyLight', () => {
  it('is what lifts the shade up to full light, so shade plus key is lit', () => {
    const { colors } = toLookState(looks.afternoon)
    const key = keyLight(colors.lit, colors.shade, new Color())
    expect(key.r + colors.shade.r).toBeCloseTo(colors.lit.r, 6)
    expect(key.g + colors.shade.g).toBeCloseTo(colors.lit.g, 6)
    expect(key.b + colors.shade.b).toBeCloseTo(colors.lit.b, 6)
  })

  it('never goes below black where the shade is brighter than the light', () => {
    const key = keyLight(new Color(0.2, 0.8, 0.5), new Color(0.6, 0.3, 0.5), new Color())
    expect(key.r).toBe(0)
    expect(key.g).toBeCloseTo(0.5, 6)
    expect(key.b).toBe(0)
  })
})
