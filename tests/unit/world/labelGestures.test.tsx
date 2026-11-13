import { afterEach, beforeAll, describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useLabelGestures } from '@/components/world/labelHooks'
import { LABELS_ID } from '@/lib/world/labels'

// jsdom has no PointerEvent: enough of one (a MouseEvent with a pointer's id, type and primacy).
beforeAll(() => {
  if (typeof globalThis.PointerEvent === 'function') return
  class FakePointerEvent extends MouseEvent {
    pointerId: number
    pointerType: string
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? 'mouse'
      this.isPrimary = init.isPrimary ?? false
    }
  }
  Object.assign(globalThis, { PointerEvent: FakePointerEvent })
})

afterEach(() => {
  document.body.innerHTML = ''
})

function Harness({ canvas }: { canvas: HTMLCanvasElement }) {
  useLabelGestures(canvas)
  return null
}

/** Two map labels and the canvas, and the presses the canvas was handed. */
function setUp() {
  document.body.innerHTML = `<div id="${LABELS_ID}"><a class="lm" id="a" href="#a">A</a><a class="lm" id="b" href="#b">B</a></div>`
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const handed: number[] = []
  canvas.addEventListener('pointerdown', (e) => handed.push((e as PointerEvent).pointerId))
  render(<Harness canvas={canvas} />)
  const label = (id: string) => document.getElementById(id)!
  const pointer = (type: string, at: HTMLElement, id: number, x = 10, y = 10, primary = true) =>
    at.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: primary, clientX: x, clientY: y }))
  /** A click on a label from pointer `id`: true if it went through (was not swallowed). */
  const click = (at: HTMLElement, id: number) => at.dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true, detail: 1, pointerId: id }))
  return { label, pointer, click, handed }
}

describe('presses that begin on a map label', () => {
  it('a lift that never came (the window lost focus) does not make the next tap on a label a second finger', () => {
    const { label, pointer, click, handed } = setUp()
    pointer('pointerdown', label('a'), 1)
    window.dispatchEvent(new Event('blur'))
    pointer('pointerdown', label('b'), 2)
    pointer('pointerup', label('b'), 2)
    expect(handed).toEqual([])
    expect(click(label('b'), 2)).toBe(true)
  })

  it('a lift lost with the page hidden is forgotten too', () => {
    const { label, pointer, click, handed } = setUp()
    pointer('pointerdown', label('a'), 1)
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    pointer('pointerdown', label('b'), 2)
    expect(handed).toEqual([])
    expect(click(label('b'), 2)).toBe(true)
  })

  it('a press handed to the map swallows its own click only: another label’s tap a moment later still follows its link', () => {
    const { label, pointer, click, handed } = setUp()
    pointer('pointerdown', label('a'), 1, 10, 10)
    pointer('pointermove', label('a'), 1, 60, 10)
    expect(handed).toEqual([1])
    pointer('pointerup', label('a'), 1, 60, 10)
    pointer('pointerdown', label('b'), 2, 10, 10)
    pointer('pointerup', label('b'), 2, 10, 10)
    expect(click(label('b'), 2)).toBe(true)
    expect(click(label('a'), 1)).toBe(false)
  })

  it('a second finger landing on a label while one is down goes to the map at once', () => {
    const { label, pointer, handed } = setUp()
    pointer('pointerdown', label('a'), 1)
    pointer('pointerdown', label('b'), 2, 50, 50, false)
    expect(handed).toEqual([2])
  })
})
