/*
 * A word typed anywhere on the page, outside a field: `roll` rolls the die.
 * Fed one key at a time, it keeps the last few letters typed and says when
 * they spell the word. A key with Ctrl, Alt or Meta held, any key that is not
 * a letter, a key typed into a field (or while a dialog holds the keys:
 * `keyIsThePages`), and a pause longer than `gapMs` between letters all start
 * it afresh. It never takes a key from anything else: the page's shortcuts
 * (`[`, `]`, `-`, `+`, `0`, the arrows, Escape) are not letters, and nothing
 * here stops a key going on. Pure.
 */

/** Letters typed further apart than this, in milliseconds, are not one word. */
export const TYPED_GAP_MS = 1500

/** What has been typed toward the word so far, and when the last letter was. */
export interface Typed {
  letters: string
  at: number
}

export const NOTHING_TYPED: Typed = { letters: '', at: -Infinity }

/** One key press, as the page saw it. */
export interface KeyPress {
  key: string
  /** When, in milliseconds. */
  at: number
  /** Ctrl, Alt or Meta was held. */
  modified: boolean
  /** The key is the page's: not typed into a field, and no dialog holds the keys (`keyIsThePages`). */
  pages: boolean
}

/** The typing after `press`, and whether it has just spelled `word` (lower-case letters). */
export function typeKey(typed: Typed, press: KeyPress, word: string, gapMs: number = TYPED_GAP_MS): { typed: Typed; spelled: boolean } {
  if (!press.pages || press.modified || !/^[a-z]$/i.test(press.key)) return { typed: NOTHING_TYPED, spelled: false }
  const before = press.at - typed.at <= gapMs ? typed.letters : ''
  const letters = (before + press.key.toLowerCase()).slice(-word.length)
  if (letters === word) return { typed: NOTHING_TYPED, spelled: true }
  return { typed: { letters, at: press.at }, spelled: false }
}
