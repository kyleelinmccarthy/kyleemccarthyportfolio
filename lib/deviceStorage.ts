/*
 * The visitor's device's storage, reached safely: what the stored
 * preferences (`lib/companionPrefs.ts`, `lib/soundPrefs.ts`) read and write
 * through. Nothing here ever throws: on the server, where storage is blocked
 * (a sandboxed frame, blocked site data) or where a read or write fails, a
 * read gives null and a write does nothing. What a value may be is for each
 * preference to check.
 */

/** Which storage: `local` lasts on the device, `session` for this visit only. */
export type StorageKind = 'local' | 'session'

/** The storage of that kind, or null on the server or where reaching it throws. */
function storage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** The stored value for `key`, or null if there is none or it cannot be read. */
export function readStored(kind: StorageKind, key: string): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Stores `value` under `key` (null removes it). Blocked storage only means it is not remembered. */
export function writeStored(kind: StorageKind, key: string, value: string | null): void {
  try {
    const s = storage(kind)
    if (!s) return
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
    // Not remembered; nothing else changes.
  }
}
