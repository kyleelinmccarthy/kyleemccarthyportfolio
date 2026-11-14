import { readStored, writeStored } from '@/lib/deviceStorage'

/*
 * How many bugs the visitor has caught on this device (localStorage), for the
 * line under "It's a feature, not a bug.". Only a plain whole number from 0
 * to `MOST_SQUASHED` counts; anything else stored (nothing, a tampered or
 * nonsense value, storage that is blocked or throws) reads as 0. No read or
 * write ever throws.
 */

/** localStorage: the count, as digits. */
export const BUGS_STORAGE_KEY = 'kym-bugs'

/** The most the count goes to; it stays there. */
export const MOST_SQUASHED = 999_999

/** The count kept on the device, or 0. */
export function readSquashed(): number {
  const stored = readStored('local', BUGS_STORAGE_KEY)
  if (stored === null || !/^\d{1,6}$/.test(stored)) return 0
  return Math.min(MOST_SQUASHED, Number(stored))
}

/** Keeps `n` on the device, held to a whole number from 0 to `MOST_SQUASHED`. */
export function storeSquashed(n: number): void {
  const count = Math.min(MOST_SQUASHED, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)))
  writeStored('local', BUGS_STORAGE_KEY, String(count))
}
