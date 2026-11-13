import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

// The player is the one thing here that would touch Web Audio: what it is asked to play is what is checked.
const played = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }))
vi.mock('@/lib/sound/player', () => ({ petVoices: played }))

import { pets } from '@/components/hud/petStore'
import { PET_IDS, pets as petContent, type PetId } from '@/content/pets'
import { VOICES } from '@/lib/sound/voices'
import { SOUND_STORAGE_KEY } from '@/lib/soundPrefs'

beforeEach(() => {
  pets.reset()
  played.play.mockClear()
  played.stop.mockClear()
})
afterEach(() => window.localStorage.clear())

describe('pressing a pet', () => {
  it('says its words in turn, round and round, each in its own voice', () => {
    const { says } = petContent.largeDog
    for (let i = 0; i < says.length * 2; i++) {
      pets.press('largeDog', { still: false })
      expect(pets.get().said?.word).toBe(says[i % says.length].word)
      expect(played.play).toHaveBeenLastCalledWith(VOICES[says[i % says.length].voice])
    }
  })

  it('says what it is, for a screen reader, and counts every saying so the same word twice is news', () => {
    pets.press('kitten', { still: false })
    const first = pets.get().said!
    expect(first).toMatchObject({ pet: 'kitten', who: petContent.kitten.who })
    pets.press('maskCat', { still: false })
    expect(pets.get().said!.n).toBe(first.n + 1)
  })

  it('makes it move, by its own cue alone: the other pets keep still', () => {
    pets.press('swirlCat', { still: false })
    pets.press('swirlCat', { still: false })
    expect(pets.get().cues.swirlCat).toBe(2)
    for (const id of PET_IDS.filter((p) => p !== 'swirlCat')) expect(pets.get().cues[id]).toBe(0)
  })

  it('under reduced motion it says its word and makes its sound, but does not move', () => {
    pets.press('mediumDog', { still: true })
    expect(pets.get().cues.mediumDog).toBe(0)
    expect(pets.get().said?.word).toBe(petContent.mediumDog.says[0].word)
    expect(played.play).toHaveBeenCalledTimes(1)
  })

  it('makes no sound while sound is off, and still says its word', () => {
    pets.setSound(false)
    pets.press('maskCat', { still: false })
    expect(played.play).not.toHaveBeenCalled()
    expect(pets.get().said?.word).toBe(petContent.maskCat.says[0].word)
  })

  it('ignores a pet that is not one of the five', () => {
    pets.press('dragon' as PetId, { still: false })
    expect(pets.get().said).toBeNull()
    expect(played.play).not.toHaveBeenCalled()
  })

  it('goes quiet: the word is taken down', () => {
    pets.press('kitten', { still: false })
    pets.quiet()
    expect(pets.get().said).toBeNull()
  })
})

describe('the sound switch', () => {
  it('starts on, makes no sound by itself, and reads the stored choice on load', () => {
    expect(pets.get().soundOff).toBe(false)
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off')
    pets.load()
    expect(pets.get().soundOff).toBe(true)
    expect(played.play).not.toHaveBeenCalled()
  })

  it('remembers a change at once, and turning sound off silences what is sounding', () => {
    pets.setSound(false)
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off')
    expect(played.stop).toHaveBeenCalled()
    pets.setSound(true)
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull()
    expect(pets.get().soundOff).toBe(false)
  })

  it('a first press reads the stored choice before it decides to make a sound', () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off')
    pets.press('largeDog', { still: false })
    expect(played.play).not.toHaveBeenCalled()
  })
})
