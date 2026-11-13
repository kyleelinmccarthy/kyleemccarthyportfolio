import { describe, it, expect, afterEach } from 'vitest'
import { isEditable, keyIsThePages } from '@/lib/keys'

afterEach(() => document.body.replaceChildren())

describe('whose key it is', () => {
  it('a field the visitor types into keeps its keys', () => {
    for (const html of ['<input>', '<textarea></textarea>', '<select></select>', '<div contenteditable="true"></div>']) {
      document.body.innerHTML = html
      const el = document.body.firstElementChild!
      expect(isEditable(el), html).toBe(true)
      expect(keyIsThePages(el), html).toBe(false)
    }
  })

  it('anywhere else on the page, a key is the page’s shortcut', () => {
    document.body.innerHTML = '<button>b</button><a href="/">a</a>'
    expect(keyIsThePages(document.body)).toBe(true)
    expect(keyIsThePages(document.querySelector('button'))).toBe(true)
    expect(keyIsThePages(window)).toBe(true)
    expect(keyIsThePages(null)).toBe(true)
  })

  it('while a dialog is open its keys are its own, wherever the key lands', () => {
    document.body.innerHTML = '<button id="out">out</button><dialog open><button id="in">in</button></dialog>'
    expect(keyIsThePages(document.getElementById('in'))).toBe(false)
    expect(keyIsThePages(document.getElementById('out'))).toBe(false)
    expect(keyIsThePages(document.body)).toBe(false)
    document.querySelector('dialog')!.removeAttribute('open')
    expect(keyIsThePages(document.getElementById('out'))).toBe(true)
  })
})
