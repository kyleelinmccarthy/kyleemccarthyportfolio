'use client'

import { useSyncExternalStore } from 'react'
import { PET_IDS, petWord, pets as petContent, type PetId } from '@/content/pets'
import { petVoices } from '@/lib/sound/player'
import { VOICES } from '@/lib/sound/voices'
import { readSoundOff, storeSoundOff } from '@/lib/soundPrefs'

/**
 * What the pets share, outside React's tree so the canvas (which React
 * context does not reach) and the HUD read the same thing: whether their
 * sounds are muted, how often each has been asked to move (its `Gesture`'s
 * cue), how often each has been pressed (which of its words comes next), and
 * what was said last. Whether sound is muted lasts on the device
 * (`lib/soundPrefs.ts`); the rest is for the page.
 */
export interface PetState {
  soundOff: boolean
  /** The stored choice has been read (on the client, once). */
  ready: boolean
  cues: Record<PetId, number>
  presses: Record<PetId, number>
  /** The last thing a pet said: which pet, what it is, its word, and a count, so the same word said again is new. */
  said: { pet: PetId; who: string; word: string; n: number } | null
}

const zeros = () => Object.fromEntries(PET_IDS.map((id) => [id, 0])) as Record<PetId, number>

/** Before anything is read, and on the server: sound on, nothing said. */
const INITIAL: PetState = { soundOff: false, ready: false, cues: zeros(), presses: zeros(), said: null }

let state = INITIAL
const listeners = new Set<() => void>()

function set(next: Partial<PetState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

export const pets = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  get: () => state,
  /** Reads the stored choice, once. */
  load() {
    if (!state.ready) set({ soundOff: readSoundOff(), ready: true })
  },
  /** Sound on or off, remembered at once; turning it off silences whatever is sounding. */
  setSound(on: boolean) {
    storeSoundOff(!on)
    if (!on) petVoices.stop()
    set({ soundOff: !on, ready: true })
  },
  /**
   * The visitor pressed pet `id`: it says its next word (shown, announced, and
   * heard unless sound is off) and makes its move, unless `still` (reduced
   * motion), when it says its word without moving. A press is the only thing
   * that ever makes a sound.
   */
  press(id: PetId, { still }: { still: boolean }) {
    if (!PET_IDS.includes(id)) return
    pets.load()
    const { word, voice } = petWord(id, state.presses[id])
    set({
      presses: { ...state.presses, [id]: state.presses[id] + 1 },
      cues: still ? state.cues : { ...state.cues, [id]: state.cues[id] + 1 },
      said: { pet: id, who: petContent[id].who, word, n: (state.said?.n ?? 0) + 1 },
    })
    if (!state.soundOff) petVoices.play(VOICES[voice])
  },
  /** The word has been shown long enough: nothing is said now. */
  quiet() {
    if (state.said) set({ said: null })
  },
  /** For tests: back to the defaults, nothing read. */
  reset() {
    state = INITIAL
    for (const listener of listeners) listener()
  },
}

/** The pets' shared state, for a component. */
export function usePets(): PetState {
  return useSyncExternalStore(pets.subscribe, pets.get, () => INITIAL)
}

/** How many times pet `id` has been asked to move: the cue its `Gesture` plays on. */
export function usePetCue(id: PetId): number {
  return useSyncExternalStore(
    pets.subscribe,
    () => state.cues[id],
    () => 0,
  )
}
