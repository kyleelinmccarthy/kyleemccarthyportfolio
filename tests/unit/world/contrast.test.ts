import { describe, it, expect } from 'vitest'
import { looks } from '@/content/sky'
import type { LookKey } from '@/content/types'
import { plates, textColors } from '@/lib/tokens'
import { composite, contrastRatio } from '@/lib/world/contrast'

const AA = 4.5

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#3A92FA', '#3A92FA')).toBe(1)
  })

  it('matches a known pair', () => {
    // #767676 on white is the classic 4.54:1 grey.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
  })

  it('rejects anything that is not #RRGGBB', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow()
  })
})

describe('composite', () => {
  it('lays a translucent colour over a backdrop as the browser does, channel by channel in sRGB', () => {
    expect(composite('#FFFFFF', 0.5, '#000000').toUpperCase()).toBe('#808080')
    expect(composite('#123456', 1, '#FFFFFF').toUpperCase()).toBe('#123456')
    expect(composite('#123456', 0, '#ABCDEF').toUpperCase()).toBe('#ABCDEF')
  })
})

/**
 * The brightest and darkest things anything on the HUD can sit over: by day a
 * white cloud or the sun's disc and the deepest outline indigo; at night a lit
 * window or the moon and black space. Pure white and pure black bound them all.
 */
const EXTREMES = ['#FFFFFF', '#000000'] as const

describe('the name on its plate, over the planet (R31)', () => {
  for (const theme of ['day', 'night'] as const) {
    for (const backdrop of EXTREMES) {
      it(`${theme}: the name holds ${AA}:1 over its plate on ${backdrop}`, () => {
        const plate = composite(plates[theme].color, plates[theme].alpha, backdrop)
        expect(contrastRatio(textColors[theme].ink, plate)).toBeGreaterThanOrEqual(AA)
      })
    }
  }
})

describe('the legend on its plate, over anything a cloud or the planet puts behind it', () => {
  for (const theme of ['day', 'night'] as const) {
    for (const token of ['ink', 'muted'] as const) {
      for (const backdrop of EXTREMES) {
        it(`${theme} ${token} holds ${AA}:1 over the plate on ${backdrop}`, () => {
          const plate = composite(plates[theme].color, plates[theme].alpha, backdrop)
          expect(contrastRatio(textColors[theme][token], plate)).toBeGreaterThanOrEqual(AA)
        })
      }
    }
  }
})

describe('text on the bare sky', () => {
  const cases: Array<[theme: 'day' | 'night', look: LookKey]> = [
    ['day', 'morning'],
    ['day', 'afternoon'],
    ['day', 'evening'],
    ['night', 'night'],
  ]

  for (const [theme, lookKey] of cases) {
    for (const token of ['ink', 'muted'] as const) {
      for (const stop of ['top', 'mid', 'bot'] as const) {
        it(`${theme} ${token} against the ${lookKey} sky (${stop}) is at least ${AA}:1`, () => {
          const ratio = contrastRatio(textColors[theme][token], looks[lookKey][stop])
          expect(ratio, `${textColors[theme][token]} on ${looks[lookKey][stop]}`).toBeGreaterThanOrEqual(AA)
        })
      }
    }
  }
})
