import { readStored, writeStored } from '@/lib/deviceStorage'

/*
 * What the visitor's device remembers about sound, and nothing else: whether
 * they muted the pets' sounds (in localStorage, so it is still muted next
 * time). Sound is on unless the exact value 'off' is stored; anything else
 * (nothing stored, an unknown or tampered value, storage that is blocked or
 * throws) reads as on. No read or write ever throws.
 */

/** localStorage: 'off' while the visitor has muted the pets' sounds. */
export const SOUND_STORAGE_KEY = 'kym-sound'

/** Whether the visitor muted the pets' sounds. Only the exact value 'off' counts. */
export function readSoundOff(): boolean {
  return readStored('local', SOUND_STORAGE_KEY) === 'off'
}

/** Remembers on this device that sound is off, or forgets it (sound on is the default, so nothing is kept). */
export function storeSoundOff(off: boolean): void {
  writeStored('local', SOUND_STORAGE_KEY, off ? 'off' : null)
}
