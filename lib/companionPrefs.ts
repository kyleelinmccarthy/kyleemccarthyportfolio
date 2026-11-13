import { DEFAULT_GUEST, type GuestChoice } from '@/content/characters'
import { readStored as read, writeStored as write } from '@/lib/deviceStorage'
import { guestChoiceFrom } from '@/lib/guests'

/*
 * What the visitor's device remembers about the characters, and nothing
 * else: the character they made for themselves (its age, style and skin
 * tone ids, in localStorage, so it is there next time), and for this visit only
 * (sessionStorage) whether they hid the guide's hints and whether she has
 * greeted them. No cookies, no network, nothing about the visitor. Every read
 * is checked against what it may be and falls back to the default on
 * anything else (nothing stored, an unknown or tampered value, storage that is
 * blocked or throws); no read or write ever throws. The same defensive shape
 * as `lib/theme.ts`; storage is reached through `lib/deviceStorage.ts`.
 */

/** localStorage: the visitor's character, as JSON of its three ids. (`kym-guest`, a retired preset's id, is ignored.) */
export const GUEST_STORAGE_KEY = 'kym-guest-v2'
/** sessionStorage: 'off' while the visitor has hidden the guide's hints this visit. */
export const HINTS_STORAGE_KEY = 'kym-guide-hints'
/** sessionStorage: '1' once the guide has greeted the visitor this visit. */
export const GREETED_STORAGE_KEY = 'kym-guide-greeted'

/** A stored value longer than this is not a choice of three short ids: it is not even parsed. */
const MOST_STORED = 200

/**
 * The character the visitor made: JSON of its three ids, each checked against
 * its option list on its own and replaced by the default's where it is not
 * one (`guestChoiceFrom`); anything that is not a small JSON object gives the
 * default. The old key (a preset's id) is never read.
 */
export function readGuest(): GuestChoice {
  const value = read('local', GUEST_STORAGE_KEY)
  if (value === null || value.length > MOST_STORED) return { ...DEFAULT_GUEST }
  try {
    return guestChoiceFrom(JSON.parse(value))
  } catch {
    return { ...DEFAULT_GUEST }
  }
}

/** Remembers the visitor's character on this device: only its three checked ids, and nothing else, are ever written. */
export function storeGuest(choice: GuestChoice): void {
  const c = guestChoiceFrom(choice)
  write('local', GUEST_STORAGE_KEY, JSON.stringify({ age: c.age, style: c.style, skin: c.skin }))
}

/** Whether the visitor hid the guide's hints this visit. Only the exact value 'off' counts. */
export function readHintsOff(): boolean {
  return read('session', HINTS_STORAGE_KEY) === 'off'
}

/** Remembers for this visit that the hints are off, or forgets it. */
export function storeHintsOff(off: boolean): void {
  write('session', HINTS_STORAGE_KEY, off ? 'off' : null)
}

/** Whether the guide has greeted the visitor this visit. Only the exact value '1' counts. */
export function readGreeted(): boolean {
  return read('session', GREETED_STORAGE_KEY) === '1'
}

/** Remembers for this visit that she has greeted them. */
export function storeGreeted(): void {
  write('session', GREETED_STORAGE_KEY, '1')
}
