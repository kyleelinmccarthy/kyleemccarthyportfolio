import { describe, it, expect } from 'vitest'
import { BUBBLE_GAP, landmarkMiddle, placeBubble, type BubblePlacement } from '@/lib/world/bubble'
import { overlaps, type ScreenRect } from '@/lib/world/labels'

const view = { width: 1600, height: 1000 }
const size = { width: 260, height: 90 }

/** The bubble's box, for a placement that stands by her. */
const boxOf = (p: BubblePlacement): ScreenRect => {
  if (p.docked) throw new Error('docked')
  return { left: p.x, top: p.y, right: p.x + size.width, bottom: p.y + size.height }
}

describe('the middle of a landmark', () => {
  it('is the middle half of its box', () => {
    expect(landmarkMiddle({ left: 0, top: 0, right: 200, bottom: 100 })).toEqual({ left: 50, right: 150, top: 25, bottom: 75 })
  })
})

describe('where the speech bubble goes', () => {
  it('stands above her head, centred, its tail over her head, when that is clear', () => {
    const p = placeBubble({ x: 600, y: 500 }, true, size, view, [], null)
    expect(p).toEqual({ docked: false, x: 600 - 130, y: 500 - BUBBLE_GAP - 90, side: 'above', tail: 130 })
  })

  it('slides along to stay on the screen, its tail still over her head', () => {
    const p = placeBubble({ x: 40, y: 500 }, true, size, view, [], null)
    if (p.docked) throw new Error('docked')
    expect(p.side).toBe('above')
    expect(p.x).toBeGreaterThanOrEqual(10)
    expect(p.x + p.tail).toBeCloseTo(40)
  })

  it('never covers the middle of the landmark: it goes beside her head instead', () => {
    // She stands in front of the landmark and to its right, as she does at every place.
    const middle = { left: 400, right: 640, top: 300, bottom: 470 }
    const p = placeBubble({ x: 700, y: 500 }, true, size, view, [], middle)
    expect(p.docked).toBe(false)
    expect(overlaps(boxOf(p), middle)).toBe(false)
    expect((p as { side: string }).side).not.toBe('above')
  })

  it('never covers the panel, the tour bar or the header: it takes another side, or docks', () => {
    const panel = { left: 1160, right: 1560, top: 98, bottom: 902 }
    const p = placeBubble({ x: 1100, y: 500 }, true, size, view, [panel], null)
    expect(p.docked).toBe(false)
    expect(overlaps(boxOf(p), panel)).toBe(false)
    // Boxed in on every side, it docks.
    const all = [{ left: 0, right: 1600, top: 0, bottom: 495 }, { left: 0, right: 1600, top: 505, bottom: 1000 }]
    expect(placeBubble({ x: 800, y: 500 }, true, size, view, all, null)).toEqual({ docked: true })
  })

  it('keeps wholly inside the screen', () => {
    for (const head of [{ x: 5, y: 5 }, { x: 1595, y: 995 }, { x: 800, y: 20 }, { x: 1590, y: 500 }]) {
      const p = placeBubble(head, true, size, view, [], null)
      if (p.docked) continue
      const box = boxOf(p)
      expect(box.left).toBeGreaterThanOrEqual(10)
      expect(box.top).toBeGreaterThanOrEqual(10)
      expect(box.right).toBeLessThanOrEqual(1590)
      expect(box.bottom).toBeLessThanOrEqual(990)
    }
  })

  it('docks when her head cannot be seen: off the screen, round the planet, or under the panel', () => {
    expect(placeBubble({ x: 600, y: 500 }, false, size, view, [], null)).toEqual({ docked: true })
    const sheet = { left: 0, right: 412, top: 690, bottom: 915 }
    expect(placeBubble({ x: 200, y: 700 }, true, size, { width: 412, height: 915 }, [sheet], null)).toEqual({ docked: true })
  })

  it('docks rather than drawing anywhere for numbers that are not numbers', () => {
    expect(placeBubble({ x: NaN, y: 500 }, true, size, view, [], null)).toEqual({ docked: true })
    expect(placeBubble({ x: 600, y: 500 }, true, { width: Infinity, height: 90 }, view, [], null)).toEqual({ docked: true })
    expect(placeBubble({ x: 600, y: 500 }, true, size, { width: NaN, height: 1000 }, [], null)).toEqual({ docked: true })
  })

  it('docks when the bubble is wider than the screen', () => {
    expect(placeBubble({ x: 200, y: 600 }, true, { width: 500, height: 90 }, { width: 412, height: 915 }, [], null)).toEqual({ docked: true })
  })

  it('on a phone, stands over her head in the open band above the sheet at its peek', () => {
    const phone = { width: 412, height: 915 }
    const covers = [{ left: 14, right: 398, top: 14, bottom: 58 }, { left: 14, right: 398, top: 686, bottom: 901 }]
    const p = placeBubble({ x: 260, y: 560 }, true, { width: 300, height: 96 }, phone, covers, { left: 150, right: 260, top: 300, bottom: 420 })
    expect(p.docked).toBe(false)
    const box = { left: (p as { x: number }).x, top: (p as { y: number }).y, right: (p as { x: number }).x + 300, bottom: (p as { y: number }).y + 96 }
    for (const c of covers) expect(overlaps(box, c)).toBe(false)
  })
})
