import { describe, it, expect } from 'vitest'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { DEFAULT_GUEST, defaultStand, guestOptions } from '@/content/characters'
import { districts, places } from '@/content/world'
import { MODEL_SCALE } from '@/lib/world/camera'
import { ADULT_HEIGHT, bubbleAnchor, characterHeight, presentingArm, standingFor, turnToward, worldAt } from '@/lib/world/characters'
import { dirOf, surfaceFrame } from '@/lib/world/geo'
import { groundOf } from '@/lib/world/terrain'
import { everyGuest, guestChoiceFrom, guestKey, guestLook, guestPicture, isGuestOption, sameGuest } from '@/lib/guests'

describe('the character a visitor makes', () => {
  const FIELDS = ['age', 'style', 'skin'] as const

  it('knows every option’s id in its own list, and nothing else', () => {
    for (const field of FIELDS) {
      for (const o of guestOptions[field]) expect(isGuestOption(field, o.id)).toBe(true)
      for (const bad of ['', 'nobody', DEFAULT_GUEST[field].toUpperCase(), ` ${DEFAULT_GUEST[field]}`, '__proto__', 'constructor', 'toString', 'hasOwnProperty', null, undefined, 3, {}, [DEFAULT_GUEST[field]]]) {
        expect(isGuestOption(field, bad), `${field} ${String(bad)}`).toBe(false)
      }
    }
    // An id from another list is not one of this list's.
    expect(isGuestOption('age', DEFAULT_GUEST.skin)).toBe(false)
  })

  it('makes a choice whole from anything, field by field, keeping nothing else', () => {
    const age = guestOptions.age.find((o) => o.id !== DEFAULT_GUEST.age)!.id
    expect(guestChoiceFrom({ age, style: 'x', extra: 1 })).toEqual({ ...DEFAULT_GUEST, age })
    for (const bad of [null, undefined, 'adult', 42, [], [age], () => age]) expect(guestChoiceFrom(bad)).toEqual(DEFAULT_GUEST)
    const inherited = Object.create({ age }) as object
    expect(guestChoiceFrom(inherited)).toEqual(DEFAULT_GUEST)
  })

  it('lists every combination once, in the lists’ order', () => {
    const all = everyGuest()
    expect(all[0]).toEqual({ age: guestOptions.age[0]!.id, style: guestOptions.style[0]!.id, skin: guestOptions.skin[0]!.id })
    expect(new Set(all.map(guestKey)).size).toBe(all.length)
    expect(all.filter((c) => sameGuest(c, DEFAULT_GUEST))).toHaveLength(1)
  })

  it('puts each combination’s picture under /world/characters, by its three ids', () => {
    expect(guestPicture({ age: 'kid', style: 'neutral', skin: 'deep' })).toBe('/world/characters/guest-kid-neutral-deep.webp')
  })

  it('turns an unknown choice into the default’s look, never a broken one', () => {
    expect(guestLook({ age: 'giant', style: 'x', skin: 'plaid' } as never)).toEqual(guestLook(DEFAULT_GUEST))
  })
})

describe('a character’s height', () => {
  it('is an adult’s, scaled by its look, within 0.9 to 1.1', () => {
    expect(characterHeight({ height: 1 })).toBeCloseTo(ADULT_HEIGHT)
    expect(characterHeight({ height: 0.95 })).toBeCloseTo(ADULT_HEIGHT * 0.95)
    expect(characterHeight({ height: 2 })).toBeCloseTo(ADULT_HEIGHT * 1.1)
    expect(characterHeight({ height: 0.1 })).toBeCloseTo(ADULT_HEIGHT * 0.9)
    expect(characterHeight({ height: NaN })).toBeCloseTo(ADULT_HEIGHT)
  })

  it('stands believably beside the doors: over a cottage’s (0.3), under the alley’s (0.42), even at its tallest', () => {
    expect(ADULT_HEIGHT * 1.1).toBeLessThan(0.42)
    expect(ADULT_HEIGHT).toBeGreaterThan(0.3)
  })
})

describe('which way a character faces', () => {
  it('turns to face a point: 0 faces +Z, a quarter turn faces +X', () => {
    expect(turnToward(0, -1)).toBeCloseTo(0)
    expect(turnToward(-1, 0)).toBeCloseTo(Math.PI / 2)
    expect(turnToward(1, 0)).toBeCloseTo(-Math.PI / 2)
    expect(Math.abs(turnToward(0, 1))).toBeCloseTo(Math.PI)
    expect(turnToward(0, 0)).toBe(0)
  })
})

describe('where the characters stand', () => {
  it('stands them on the default spots, on the ground, where a place gives none', () => {
    const s = standingFor('somewhere', {})
    expect(s.guide.at).toEqual([defaultStand.guide.at[0], 0, defaultStand.guide.at[1]])
    expect(s.guest.at).toEqual([defaultStand.guest.at[0], 0, defaultStand.guest.at[1]])
  })

  it('turns the guide part of the way from the front toward the visitor’s character, who faces between her and the landmark', () => {
    const s = standingFor('somewhere', {}, { guide: { at: [0.5, 1] }, guest: { at: [1, 1] } })
    // The visitor's character is a quarter turn to her left: she turns toward them, and still faces the front more than them.
    expect(s.guide.turn).toBeGreaterThan(0)
    expect(s.guide.turn).toBeLessThan(Math.PI / 4)
    // They face between her (a quarter turn to their right) and the landmark's middle.
    const [toGuide, toLandmark] = [turnToward(1, 1, 0.5, 1), turnToward(1, 1)]
    expect(Math.abs(toGuide)).toBeLessThan(Math.abs(s.guest.turn))
    expect(Math.abs(s.guest.turn)).toBeLessThan(Math.abs(toLandmark))
    expect(s.guest.turn).toBeCloseTo((toGuide + toLandmark) / 2)
  })

  it('mirrors: on the landmark’s other side they turn the other way', () => {
    const right = standingFor('somewhere', {}, { guide: { at: [0.5, 1] }, guest: { at: [1, 0.9] } })
    const left = standingFor('somewhere', {}, { guide: { at: [-0.5, 1] }, guest: { at: [-1, 0.9] } })
    expect(left.guide.turn).toBeCloseTo(-right.guide.turn)
    expect(left.guest.turn).toBeCloseTo(-right.guest.turn)
  })

  it('has the guide hold out the arm away from the visitor’s character: her right when they are on her left', () => {
    const right = standingFor('somewhere', {}, { guide: { at: [0.5, 1] }, guest: { at: [1, 0.9] } })
    const left = standingFor('somewhere', {}, { guide: { at: [-0.5, 1] }, guest: { at: [-1, 0.9] } })
    expect(presentingArm(right.guide, right.guest)).toBe(-1)
    expect(presentingArm(left.guide, left.guest)).toBe(1)
    // Straight in front of her: her right.
    expect(presentingArm({ at: [0, 0, 0], turn: 0 }, { at: [0, 0, 1], turn: 0 })).toBe(-1)
    // Turned right round, her left is where her right was.
    expect(presentingArm({ at: [0, 0, 0], turn: Math.PI }, { at: [1, 0, 0], turn: 0 })).toBe(1)
  })

  it('takes a place’s own spots, either alone, and a spot’s own turn', () => {
    const overrides = { here: { guest: { at: [-0.5, 0.6] as [number, number], turn: 0.4 } } }
    const s = standingFor('here', overrides)
    expect(s.guest).toEqual({ at: [-0.5, 0, 0.6], turn: 0.4 })
    expect(s.guide.at).toEqual([defaultStand.guide.at[0], 0, defaultStand.guide.at[1]])
  })

  it('never stands a character on a spot that is not a number', () => {
    const overrides = { here: { guide: { at: [NaN, Infinity] as [number, number], turn: NaN } } }
    const s = standingFor('here', overrides)
    expect(s.guide.at.every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(s.guide.turn)).toBe(true)
  })
})

describe('where a character is in the world', () => {
  it('carries a point at a place exactly as OnGround stands the landmark', () => {
    const place = places.find((p) => p.id === 'beacon')!
    const local: [number, number, number] = [0.4, 0.2, 0.9]
    const { up, south, east } = surfaceFrame(dirOf(place.at))
    const matrix = new Matrix4().compose(groundOf(place.at, districts), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(east, up, south)), new Vector3(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE))
    const expected = new Vector3(...local).applyMatrix4(matrix)
    expect(worldAt(place, districts, local).distanceTo(expected)).toBeLessThan(1e-9)
  })

  it('points the bubble just over the guide’s head', () => {
    const place = places[0]!
    const standing = standingFor(place.id)
    const head = bubbleAnchor(place, districts, standing.guide, { height: 1 })
    const feet = worldAt(place, districts, standing.guide.at)
    const rise = head.clone().sub(feet).dot(dirOf(place.at)) / MODEL_SCALE
    expect(rise).toBeGreaterThan(ADULT_HEIGHT)
    expect(rise).toBeLessThan(ADULT_HEIGHT + 0.1)
  })
})
