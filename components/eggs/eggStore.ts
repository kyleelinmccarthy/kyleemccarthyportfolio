'use client'

import { useSyncExternalStore } from 'react'
import { pets } from '@/components/hud/petStore'
import { readSquashed, storeSquashed } from '@/lib/eggs/bugCount'
import { riggedTo, rollD20 } from '@/lib/eggs/d20'
import { takeRiggedRoll } from '@/lib/eggs/hooks'
import { petVoices } from '@/lib/sound/player'
import { VOICES } from '@/lib/sound/voices'

/*
 * What the two easter eggs share, outside React's tree so the canvas (the bug,
 * the constellation) and the page (the words, the die, the bursts) read the
 * same thing: how many bugs have been caught on this device, the last catch,
 * and the roll under way. Their sounds are the pets' player's, under the
 * pets' mute (`petStore`), and only ever follow a press or a typed word.
 */

/** A point on the screen, in CSS pixels. */
export interface ScreenPoint {
  x: number
  y: number
}

export interface EggState {
  /** Bugs caught on this device (`lib/eggs/bugCount.ts`), once read. */
  squashed: number
  /** The stored count has been read (on the client, once). */
  ready: boolean
  /** The last catch: where on the screen, its count, and a number for each catch so the same place twice is new. */
  caught: { at: ScreenPoint; count: number; n: number } | null
  /** The roll under way: what it came up, and a number for each roll. Null when no die is out. */
  roll: { value: number; n: number } | null
}

const INITIAL: EggState = { squashed: 0, ready: false, caught: null, roll: null }

let state = INITIAL
/** Every roll so far this visit, so each has its own number. */
let rolls = 0
const listeners = new Set<() => void>()

function set(next: Partial<EggState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

/** Plays `voice` unless the visitor has muted the pets' sounds. */
function sound(voice: keyof typeof VOICES) {
  pets.load()
  if (!pets.get().soundOff) petVoices.play(VOICES[voice])
}

export const eggs = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  get: () => state,
  /** Reads the stored count, once. */
  load() {
    if (!state.ready) set({ squashed: readSquashed(), ready: true })
  },
  /** The visitor caught the bug, at `at` on the screen: one more squashed, remembered at once, said, and popped. */
  squash(at: ScreenPoint) {
    eggs.load()
    const count = state.squashed + 1
    storeSquashed(count)
    set({ squashed: count, caught: { at, count, n: (state.caught?.n ?? 0) + 1 } })
    sound('pop')
  },
  /** The bug's words have been up long enough. */
  quietCatch() {
    if (state.caught) set({ caught: null })
  },
  /** Rolls the die (with `rand`, `Math.random` unless a test hands one in), unless one is already out. */
  roll(rand: () => number = Math.random) {
    if (state.roll) return
    rolls++
    set({ roll: { value: rollD20(rand), n: rolls } })
  },
  /** The die has come to rest. */
  landed() {
    if (state.roll) sound('clack')
  },
  /** The die and its result have gone. */
  putAway() {
    if (state.roll) set({ roll: null })
  },
  /** For tests: back to the defaults, nothing read. */
  reset() {
    state = INITIAL
    rolls = 0
    for (const listener of listeners) listener()
  },
}

/** Rolls the die as the visitor asked (a press on the stars, or the typed word): at random, or, in an e2e build, as a test rigged it (`__eggRoll`). */
export function rollForVisitor(): void {
  const rigged = takeRiggedRoll(process.env.NEXT_PUBLIC_E2E, typeof window === 'undefined' ? undefined : window)
  eggs.roll(rigged === null ? Math.random : riggedTo(rigged))
}

/** The eggs' shared state, for a component. */
export function useEggs(): EggState {
  return useSyncExternalStore(eggs.subscribe, eggs.get, () => INITIAL)
}
