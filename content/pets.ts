import type { ModelKey } from './types'
import type { Move } from '@/lib/world/gesture'
import type { VoiceId } from '@/lib/sound/voices'

/*
 * The owner's five pets in Home's garden, as the visitor meets them: what
 * each says when pressed (its words in turn, each with the voice it is said
 * in, `lib/sound/voices.ts`) and the small movement it makes as it says it
 * (`lib/world/gesture.ts`). The pets are only ever called by what they are,
 * never by name. Where each stands is the House model's business
 * (`lib/world/pets.ts`).
 */

/** The landmark the pets live at: they take presses only at its place, while it is open. */
export const PETS_LIVE_AT: ModelKey = 'house'

/** The five pets, by what they are: the ids the House's model gives their groups (`pet:<id>`). */
export const PET_IDS = ['maskCat', 'swirlCat', 'kitten', 'mediumDog', 'largeDog'] as const
export type PetId = (typeof PET_IDS)[number]

/** One thing a pet says: the word shown over it (and told to a screen reader) and the voice it is said in. */
export interface PetWord {
  word: string
  voice: VoiceId
}

export interface Pet {
  /** What it is, for a screen reader: "A cat says: Meow!". */
  who: string
  /** What it says, in turn, one a press. */
  says: PetWord[]
  /** What it does as it says it. */
  move: Move
}

export const pets: Record<PetId, Pet> = {
  // The senior cat, calm on her stone: a purr, and a slow lean toward the visitor and back.
  maskCat: {
    who: 'A cat',
    says: [
      { word: 'Purr…', voice: 'purr' },
      { word: 'Meow.', voice: 'softMeow' },
    ],
    move: { seconds: 1.4, beats: 1, bow: 0.1, turn: 0.18 },
  },
  // The young cat at the pond: a hop.
  swirlCat: {
    who: 'A cat',
    says: [
      { word: 'Meow!', voice: 'meow' },
      { word: 'Mrrp?', voice: 'chirp' },
    ],
    move: { seconds: 0.5, beats: 1, lift: 0.035 },
  },
  // The kitten: two quick little hops.
  kitten: {
    who: 'The kitten',
    says: [
      { word: 'Mew!', voice: 'mew' },
      { word: 'Mew mew!', voice: 'mewMew' },
    ],
    move: { seconds: 0.6, beats: 2, lift: 0.028 },
  },
  // The medium dog: a bounce on the spot, with a look round.
  mediumDog: {
    who: 'A dog',
    says: [
      { word: 'Arf!', voice: 'arf' },
      { word: 'Arf arf!', voice: 'arfArf' },
    ],
    move: { seconds: 0.7, beats: 2, lift: 0.03, turn: 0.14 },
  },
  // The large dog, sitting: a happy wiggle.
  largeDog: {
    who: 'A dog',
    says: [
      { word: 'Woof!', voice: 'woof' },
      { word: 'Woof woof!', voice: 'woofWoof' },
    ],
    move: { seconds: 0.9, beats: 3, rock: 0.06, lift: 0.006 },
  },
}

/** What a pet says on its `press`th press (from 0): its words in turn, round and round. */
export function petWord(id: PetId, press: number): PetWord {
  const { says } = pets[id]
  const n = Number.isFinite(press) ? Math.max(0, Math.floor(press)) : 0
  return says[n % says.length]
}
