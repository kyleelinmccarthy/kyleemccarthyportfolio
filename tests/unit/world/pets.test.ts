import { describe, it, expect } from 'vitest'
import { PET_IDS, PETS_LIVE_AT, petWord, pets } from '@/content/pets'
import { places } from '@/content/world'
import { VOICES } from '@/lib/sound/voices'
import { PET_HITS, PET_SPOTS, petAnchor, petMiddle } from '@/lib/world/pets'

describe('the pets’ content', () => {
  it('lives at one place’s landmark', () => {
    expect(places.filter((p) => p.model === PETS_LIVE_AT)).toHaveLength(1)
  })

  it.each(PET_IDS)('the %s says at least one word, each short, in a voice there is', (id) => {
    const pet = pets[id]
    expect(pet.who.length).toBeGreaterThan(0)
    expect(pet.says.length).toBeGreaterThan(0)
    for (const { word, voice } of pet.says) {
      expect(word.length).toBeGreaterThan(0)
      expect(word.length).toBeLessThanOrEqual(14)
      expect(VOICES[voice]).toBeDefined()
    }
  })

  it.each(PET_IDS)('the %s makes a small move that ends at rest in a moment', (id) => {
    const { move } = pets[id]
    expect(move.seconds).toBeGreaterThan(0.2)
    expect(move.seconds).toBeLessThanOrEqual(1.5)
    expect(move.beats).toBeGreaterThanOrEqual(1)
    // Small: a hop no higher than a cat's head is wide, a turn of a few degrees.
    expect(move.lift ?? 0).toBeLessThanOrEqual(0.05)
    for (const turn of [move.rock, move.bow, move.turn]) expect(Math.abs(turn ?? 0)).toBeLessThanOrEqual(0.25)
  })

  it('a pet’s words come round in turn, and any press count picks one', () => {
    const { says } = pets.largeDog
    expect(petWord('largeDog', 0)).toBe(says[0])
    expect(petWord('largeDog', says.length)).toBe(says[0])
    for (const n of [-3, Number.NaN, 1.7, Number.POSITIVE_INFINITY]) expect(says).toContain(petWord('largeDog', n))
  })
})

describe('where the pets stand and take a press', () => {
  it('every pet has a spot and a hit shape, and nothing else does', () => {
    expect(Object.keys(PET_SPOTS).sort()).toEqual([...PET_IDS].sort())
    expect(Object.keys(PET_HITS).sort()).toEqual([...PET_IDS].sort())
  })

  it('no two pets’ hit shapes reach each other', () => {
    for (const a of PET_IDS) {
      for (const b of PET_IDS) {
        if (a >= b) continue
        const [ax, , az] = petMiddle(a)
        const [bx, , bz] = petMiddle(b)
        const reach = (id: (typeof PET_IDS)[number]) => Math.max(PET_HITS[id].radii[0], PET_HITS[id].radii[2])
        expect(Math.hypot(ax - bx, az - bz), `${a} and ${b}`).toBeGreaterThan(reach(a) + reach(b))
      }
    }
  })

  it('every word bubble points over its pet’s head', () => {
    for (const id of PET_IDS) {
      const [x, y, z] = petAnchor(id)
      const { at } = PET_SPOTS[id]
      expect([x, z]).toEqual([at[0], at[2]])
      expect(y).toBeGreaterThan(at[1] + PET_HITS[id].middle[1] + PET_HITS[id].radii[1])
    }
  })
})
