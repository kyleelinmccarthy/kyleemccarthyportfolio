import { describe, it, expect } from 'vitest'
import { guestOptions, guideLook, type Age } from '@/content/characters'
import { everyGuest, guestKey, guestLook } from '@/lib/guests'
import { characterHeight } from '@/lib/world/characters'
import { ADULT_HEIGHT, AGE_BUILD, BUILD_WIDTH, armPose, figureOf } from '@/lib/world/figure'
// The guide's figure as it was drawn before ages were added: hers must not move by a hair.
import pinned from './guideFigure.json'

const looks = [guideLook, ...everyGuest().map(guestLook)]

/** Rounds every number in `value` to 9 places, so a pin compares the figure, not the last bit of a float. */
const rounded = (value: unknown): unknown =>
  typeof value === 'number' ? Number(value.toFixed(9)) : Array.isArray(value) ? value.map(rounded) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rounded(v)])) : value

describe('the guide’s figure', () => {
  it('is exactly what it was before ages: an adult’s, every part where it was', () => {
    expect(rounded(figureOf(guideLook))).toEqual(rounded(pinned))
    expect(rounded(figureOf({ ...guideLook, age: 'adult' }))).toEqual(rounded(pinned))
  })

  it('is an adult’s, as tall as ever', () => {
    expect(guideLook.age ?? 'adult').toBe('adult')
    expect(characterHeight(guideLook)).toBe(ADULT_HEIGHT)
    expect(AGE_BUILD.adult).toEqual({ height: 1, head: 0.27, body: 1, width: 1 })
  })
})

/** The head's share of the figure's height. */
const headShare = (age: Age) => {
  const f = figureOf({ build: 'average', height: 1, age })
  return f.head.size[1] / f.height
}

describe('ages', () => {
  it('has proportions for every age the picker offers', () => {
    for (const { id } of guestOptions.age) expect(AGE_BUILD[id], id).toBeDefined()
  })

  it('makes a kid about 0.62 of an adult’s height, with a clearly larger share of it in the head', () => {
    const kid = characterHeight({ height: 1, age: 'kid' }) / ADULT_HEIGHT
    expect(kid).toBeGreaterThan(0.58)
    expect(kid).toBeLessThan(0.66)
    expect(headShare('kid')).toBeGreaterThan(headShare('adult') * 1.15)
  })

  it('makes a teen about 0.88 of an adult’s height, the head a little larger in share; an elder about 0.96, the head as an adult’s', () => {
    expect(characterHeight({ height: 1, age: 'teen' }) / ADULT_HEIGHT).toBeCloseTo(0.88, 2)
    expect(headShare('teen')).toBeGreaterThan(headShare('adult'))
    expect(headShare('teen')).toBeLessThan(headShare('kid'))
    expect(characterHeight({ height: 1, age: 'elder' }) / ADULT_HEIGHT).toBeCloseTo(0.96, 2)
    expect(headShare('elder')).toBeCloseTo(headShare('adult'))
  })

  it('stands an elder as straight as an adult: no stoop, the head over the feet', () => {
    const f = figureOf({ build: 'average', height: 1, age: 'elder' })
    expect(f.head.at[0]).toBe(0)
    expect(f.head.at[2]).toBe(0)
    expect(f.chest.at[2]).toBe(0)
  })

  it('orders the ages by height: kid, teen, elder, adult', () => {
    const h = (age: Age) => characterHeight({ height: 1, age })
    expect(h('kid')).toBeLessThan(h('teen'))
    expect(h('teen')).toBeLessThan(h('elder'))
    expect(h('elder')).toBeLessThan(h('adult'))
  })

  it('treats an unknown age as an adult’s', () => {
    expect(characterHeight({ height: 1, age: 'giant' as Age })).toBe(ADULT_HEIGHT)
  })
})

describe('a figure’s proportions', () => {
  it.each(looks.map((l, i) => [i === 0 ? 'the guide' : guestKey(everyGuest()[i - 1]!), l] as const))('%s: its head’s top at its height, its legs from the hips to the ankles, its body stacked hips, waist, chest', (_, look) => {
    const f = figureOf(look)
    const H = characterHeight(look)
    expect(f.height).toBeCloseTo(H)
    expect(f.head.at[1] + f.head.size[1] / 2).toBeCloseTo(H)
    for (const leg of f.legs) {
      expect(leg.to[1]).toBeGreaterThan(0)
      expect(leg.to[1]).toBeLessThan(f.foot.size[1] * 1.5)
      expect(leg.from[1]).toBeGreaterThan(f.hips.at[1] - f.hips.size[1] / 2)
      expect(leg.from[1]).toBeLessThan(f.hips.at[1] + f.hips.size[1] / 2 + H * 0.03)
      // Tapering to the ankle.
      expect(leg.bottom).toBeLessThan(leg.top)
    }
    expect(f.hips.at[1]).toBeLessThan(f.waist.at[1])
    expect(f.waist.at[1]).toBeLessThan(f.chest.at[1])
    // A waist: narrower than the shoulders and the hips.
    expect(f.waist.size[0]).toBeLessThan(f.chest.size[0])
    expect(f.waist.size[0]).toBeLessThan(f.hips.size[0])
    // The chest reaches the shoulders, the neck the head.
    expect(f.chest.at[1] + f.chest.size[1] / 2).toBeGreaterThan(f.shoulder.y)
    expect(f.neck.to).toBeGreaterThan(f.head.at[1] - f.head.size[1] / 2)
  })

  it('stands on one leg and rests the other: the right straight, the left out and forward', () => {
    const [right, left] = figureOf(guideLook).legs
    expect(Math.abs(right.to[0] - right.from[0])).toBeLessThan(Math.abs(left.to[0] - left.from[0]))
    expect(left.to[2]).toBeGreaterThan(right.to[2])
  })

  it('widens with the build, never the height', () => {
    const slim = figureOf({ build: 'slim', height: 1 })
    const broad = figureOf({ build: 'broad', height: 1 })
    expect(broad.chest.size[0] / slim.chest.size[0]).toBeCloseTo(BUILD_WIDTH.broad / BUILD_WIDTH.slim)
    expect(broad.height).toBeCloseTo(slim.height)
  })

  it('poses an arm from its shoulder: down by the side, raised to wave, or a hand in the pocket at the hip', () => {
    const f = figureOf(guideLook)
    const down = armPose(f, -1, 'down')
    const wave = armPose(f, -1, 'wave')
    const pocket = armPose(f, 1, 'pocket')
    expect(down.shoulder[0]).toBeLessThan(0)
    expect(down.hand[1]).toBeLessThan(f.belt)
    expect(wave.hand[1]).toBeGreaterThan(f.shoulder.y)
    expect(pocket.hand[1]).toBeCloseTo(f.hips.at[1] + f.hips.size[1] * 0.12)
    expect(pocket.hand[0]).toBeGreaterThan(0)
    // Upper arm and forearm are the lengths the figure says.
    const len = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)
    expect(len(down.shoulder, down.elbow)).toBeCloseTo(f.arm.upper, 2)
    expect(len(wave.elbow, wave.hand)).toBeCloseTo(f.arm.fore, 2)
  })
})
