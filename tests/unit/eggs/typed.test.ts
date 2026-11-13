import { afterEach, describe, it, expect } from 'vitest'
import { keyIsThePages } from '@/lib/keys'
import { NOTHING_TYPED, TYPED_GAP_MS, typeKey, type KeyPress, type Typed } from '@/lib/eggs/typed'

afterEach(() => document.body.replaceChildren())

/** Types `keys` one after another, `every` milliseconds apart, landing on `target`; whether the word was spelled at any key. */
function type(keys: string[], { every = 100, target = document.body as EventTarget | null, modified = false } = {}) {
  let typed: Typed = NOTHING_TYPED
  const spelled: boolean[] = []
  keys.forEach((key, i) => {
    const press: KeyPress = { key, at: 1000 + i * every, modified, pages: keyIsThePages(target) }
    const next = typeKey(typed, press, 'roll')
    typed = next.typed
    spelled.push(next.spelled)
  })
  return spelled
}

describe('typing roll', () => {
  it('rolls on its last letter, and only then', () => {
    expect(type(['r', 'o', 'l', 'l'])).toEqual([false, false, false, true])
  })

  it('in capitals too, and after other letters', () => {
    expect(type(['x', 'R', 'O', 'L', 'L']).at(-1)).toBe(true)
    expect(type(['t', 'r', 'o', 'l', 'l']).at(-1)).toBe(true)
  })

  it('starts afresh after a key that is not a letter: the page’s shortcuts never spell it', () => {
    expect(type(['r', 'o', '[', 'l', 'l']).at(-1)).toBe(false)
    expect(type(['r', 'o', 'ArrowLeft', 'l', 'l']).at(-1)).toBe(false)
    for (const key of ['[', ']', '-', '+', '0', 'ArrowRight', 'Escape', 'Enter', ' ']) expect(type([key]), key).toEqual([false])
  })

  it('is not typed into a field: an input, a text area, a select or editable text keeps its keys', () => {
    for (const html of ['<input>', '<textarea></textarea>', '<select></select>', '<div contenteditable="true"></div>']) {
      document.body.innerHTML = html
      expect(type(['r', 'o', 'l', 'l'], { target: document.body.firstElementChild }), html).toEqual([false, false, false, false])
    }
  })

  it('is not typed while a dialog holds the keys', () => {
    document.body.innerHTML = '<dialog open><button>in</button></dialog>'
    expect(type(['r', 'o', 'l', 'l'], { target: document.querySelector('button') }).at(-1)).toBe(false)
  })

  it('is not typed with Ctrl, Alt or Meta held (a browser’s own shortcut)', () => {
    expect(type(['r', 'o', 'l', 'l'], { modified: true }).at(-1)).toBe(false)
  })

  it('is one word only when typed as one: a long pause between letters starts it afresh', () => {
    expect(type(['r', 'o', 'l', 'l'], { every: TYPED_GAP_MS + 1 }).at(-1)).toBe(false)
    expect(type(['r', 'o', 'l', 'l'], { every: TYPED_GAP_MS }).at(-1)).toBe(true)
  })

  it('rolls again when typed again, and not on a stray fourth l', () => {
    expect(type(['r', 'o', 'l', 'l', 'r', 'o', 'l', 'l'])).toEqual([false, false, false, true, false, false, false, true])
    expect(type(['r', 'o', 'l', 'l', 'l'])).toEqual([false, false, false, true, false])
  })
})
