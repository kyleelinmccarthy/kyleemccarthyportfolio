'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_GUEST, type GuestChoice } from '@/content/characters'
import { readGreeted, readGuest, readHintsOff, storeGreeted, storeGuest, storeHintsOff } from '@/lib/companionPrefs'
import { GUEST_FIELDS, isGuestOption, sameGuest } from '@/lib/guests'

/**
 * What the characters' controls share, outside React's tree so the canvas
 * (which React context does not reach) and the HUD read the same thing: the
 * visitor's character, whether the guide's hints are hidden, whether she has
 * greeted them, and whether the picker is open. What lasts is kept by
 * `lib/companionPrefs.ts`; this only holds it for the page.
 */
export interface CompanionState {
  /** The visitor's character: an age, a style and a skin tone, always ones the option lists offer. */
  guest: GuestChoice
  hintsOff: boolean
  greeted: boolean
  picker: boolean
  /**
   * How many times the picker has been asked to open: a new ask opens it even
   * if the store still thinks it open (a dialog's close event arrives a moment
   * after it closes, so a quick reopen would otherwise be lost).
   */
  asks: number
  /** The stored choices have been read (on the client, once). */
  ready: boolean
}

/** Before anything is read, and on the server: the defaults. */
const INITIAL: CompanionState = { guest: DEFAULT_GUEST, hintsOff: false, greeted: false, picker: false, asks: 0, ready: false }

let state = INITIAL
const listeners = new Set<() => void>()

function set(next: Partial<CompanionState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

export const companions = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  get: () => state,
  /** Reads the stored choices, once. */
  load() {
    if (!state.ready) set({ guest: readGuest(), hintsOff: readHintsOff(), greeted: readGreeted(), ready: true })
  },
  /**
   * The visitor changes some of their character (its age, its style, its
   * skin tone): each field given is taken only if its list offers it (an
   * unknown one is ignored), the rest stay as they are. Stored at once.
   */
  chooseGuest(change: Partial<GuestChoice>) {
    const next: GuestChoice = { ...state.guest }
    for (const f of GUEST_FIELDS) {
      const v = change?.[f]
      if (isGuestOption(f, v)) Object.assign(next, { [f]: v })
    }
    if (sameGuest(next, state.guest)) return
    storeGuest(next)
    set({ guest: next })
  },
  setHints(on: boolean) {
    storeHintsOff(!on)
    set({ hintsOff: !on })
  },
  greet() {
    if (state.greeted) return
    storeGreeted()
    set({ greeted: true })
  },
  openPicker() {
    set({ picker: true, asks: state.asks + 1 })
  },
  closePicker() {
    set({ picker: false })
  },
  /** For tests: back to the defaults, nothing read. */
  reset() {
    state = INITIAL
    for (const listener of listeners) listener()
  },
}

/** The characters' shared state, for a component. */
export function useCompanions(): CompanionState {
  return useSyncExternalStore(companions.subscribe, companions.get, () => INITIAL)
}
