import { describe, it, expect } from 'vitest'
import { DOUBLE_TAP } from '@/lib/world/gestures'
import { POINTERS_START, labelPressIsTheMaps, pointerReduce, type PointerAction, type PointerEventIn, type PointerState } from '@/lib/world/pointers'
import { CLICK_SLOP } from '@/lib/world/rig'

/** Runs `events` from `state`, collecting every action. */
function run(events: PointerEventIn[], state: PointerState = POINTERS_START) {
  const actions: PointerAction[] = []
  for (const event of events) {
    const out = pointerReduce(state, event)
    state = out.state
    actions.push(...out.actions)
  }
  return { state, actions }
}

const finger = (id: number, x: number, y: number, t = 0, primary = false): PointerEventIn => ({ type: 'down', id, x, y, t, kind: 'touch', primary, button: 0 })
/** A primary finger a map label hands to the map late (`useLabelGestures`). */
const handed = (id: number, x: number, y: number, t = 0): PointerEventIn => ({ type: 'down', id, x, y, t, kind: 'touch', primary: true, button: 0, handedOver: true })
const mouse = (id: number, x: number, y: number, t = 0, button = 0): PointerEventIn => ({ type: 'down', id, x, y, t, kind: 'mouse', primary: true, button })
const move = (id: number, x: number, y: number): PointerEventIn => ({ type: 'move', id, x, y })
const up = (id: number, t = 0): PointerEventIn => ({ type: 'up', id, t, cancel: false })
const cancel = (id: number, t = 0): PointerEventIn => ({ type: 'up', id, t, cancel: true })

const kinds = (actions: PointerAction[]) => actions.map((a) => a.type)
const moves = (actions: PointerAction[]) => actions.filter((a) => a.type === 'drag' || a.type === 'zoom')

describe('a press on a map label', () => {
  it('is a tap on the label until it moves further than a click may, then it is the map’s', () => {
    expect(labelPressIsTheMaps(0, 0)).toBe(false)
    expect(labelPressIsTheMaps(CLICK_SLOP, 0)).toBe(false)
    expect(labelPressIsTheMaps(CLICK_SLOP + 0.5, 0)).toBe(true)
  })

  it('is the map’s at once when another finger is already down: the second finger of a pinch', () => {
    expect(labelPressIsTheMaps(0, 1)).toBe(true)
  })
})

describe('pointers at a place', () => {
  it('drags with one finger or the mouse', () => {
    for (const down of [finger(1, 100, 100, 0, true), mouse(1, 100, 100)]) {
      const { actions } = run([down, move(1, 110, 95), up(1)])
      expect(moves(actions)).toEqual([{ type: 'drag', dx: 10, dy: -5 }])
      expect(kinds(actions)).toEqual(['capture', 'drag', 'release'])
    }
  })

  it('pinches with two fingers: apart is in', () => {
    const { actions } = run([finger(1, 100, 100, 0, true), finger(2, 200, 100), move(2, 300, 100)])
    expect(moves(actions)).toEqual([{ type: 'zoom', scale: 0.5 }])
  })

  it('a pinch can begin as a drag, and goes on as a drag from where the other finger is when one lifts mid-pinch', () => {
    const { actions, state } = run([
      finger(1, 100, 100, 0, true),
      move(1, 120, 100),
      finger(2, 220, 100),
      move(2, 320, 100),
      up(2),
      move(1, 125, 104),
    ])
    expect(moves(actions)).toEqual([
      { type: 'drag', dx: 20, dy: 0 },
      { type: 'zoom', scale: 0.5 },
      // No jump: from the remaining finger's own last place.
      { type: 'drag', dx: 5, dy: 4 },
    ])
    expect(state.tracked.map((p) => p.id)).toEqual([1])
  })

  it('a cancelled pointer is let go, and the next finger drags', () => {
    const { actions, state } = run([finger(1, 100, 100, 0, true), cancel(1), finger(2, 50, 50, 500, true), move(2, 60, 50)])
    expect(moves(actions)).toEqual([{ type: 'drag', dx: 10, dy: 0 }])
    expect(state.tracked.map((p) => p.id)).toEqual([2])
  })

  it('a finger whose lift never came is dropped when a new touch begins, so the next drag is not a pinch', () => {
    // Finger 1 went down and its up was lost (a system gesture, an alert). A new touch starts: it is the primary one.
    const { actions } = run([finger(1, 100, 100, 0, true), finger(2, 300, 300, 2000, true), move(2, 310, 300)])
    expect(moves(actions)).toEqual([{ type: 'drag', dx: 10, dy: 0 }])
  })

  it('a pinch whose first finger began on a label stays a pinch: the label hands that finger over late, and it is not a new touch', () => {
    // The thumb lands on a label (the canvas does not see it yet), the index finger on the canvas, which drags with it;
    // the thumb moves past a click's slop and the label hands it to the canvas, a primary down that is not the first.
    const late = handed(1, 100, 100, 50)
    const { actions, state } = run([finger(2, 300, 100, 0), move(2, 310, 100), late, move(1, 80, 100), move(2, 340, 100)])
    expect(state.tracked.map((p) => p.id).sort()).toEqual([1, 2])
    expect(state.gesture?.pinched).toBe(true)
    expect(actions.filter((a) => a.type === 'release')).toEqual([])
    // A drag for the lone finger, then only zooms: the pinch never turns into a drag that jumps.
    expect(moves(actions).slice(1).every((a) => a.type === 'zoom')).toBe(true)
  })

  it('a handed-over first finger with no other finger down still begins a drag', () => {
    const late = handed(1, 100, 100, 0)
    expect(moves(run([late, move(1, 110, 100)]).actions)).toEqual([{ type: 'drag', dx: 10, dy: 0 }])
  })

  it('clearing (focus lost, the page hidden, capture lost, the camera leaving the place) lets every pointer go', () => {
    const before = run([finger(1, 100, 100, 0, true), finger(2, 200, 100)]).state
    const { state, actions } = run([{ type: 'clear' }], before)
    expect(state.tracked).toEqual([])
    expect(state.gesture).toBeNull()
    expect(actions).toEqual([
      { type: 'release', id: 1 },
      { type: 'release', id: 2 },
    ])
    // Nothing moves for a pointer no longer tracked.
    expect(moves(run([move(1, 150, 100)], state).actions)).toEqual([])
  })

  it('only fingers pinch: the mouse held while a finger is down, or a finger while the mouse is down, is ignored', () => {
    const mouseThenFinger = run([mouse(1, 100, 100), finger(2, 200, 100, 0, true), move(2, 300, 100), move(1, 110, 100)])
    expect(moves(mouseThenFinger.actions)).toEqual([{ type: 'drag', dx: 10, dy: 0 }])
    const fingerThenMouse = run([finger(1, 100, 100, 0, true), mouse(2, 200, 100), move(2, 300, 100), move(1, 110, 100)])
    expect(moves(fingerThenMouse.actions)).toEqual([{ type: 'drag', dx: 10, dy: 0 }])
  })

  it('ignores a third finger', () => {
    const { actions } = run([finger(1, 100, 100, 0, true), finger(2, 200, 100), finger(3, 150, 300), move(3, 150, 400), move(2, 300, 100)])
    expect(moves(actions)).toEqual([{ type: 'zoom', scale: 0.5 }])
    expect(kinds(actions).filter((k) => k === 'capture')).toHaveLength(2)
  })

  it('ignores any mouse button but the main one', () => {
    expect(run([mouse(1, 100, 100, 0, 2), move(1, 150, 100)]).actions).toEqual([])
  })

  it('a double tap resets; a drag, a pinch or a cancel between taps does not count', () => {
    const tap = (id: number, at: number, x = 100): PointerEventIn[] => [finger(id, x, 100, at, true), up(id, at + 60)]
    expect(kinds(run([...tap(1, 0), ...tap(2, 200)]).actions)).toContain('reset')
    // Too slow.
    expect(kinds(run([...tap(1, 0), ...tap(2, 60 + DOUBLE_TAP.ms + 1)]).actions)).not.toContain('reset')
    // The first was a drag.
    expect(kinds(run([finger(1, 100, 100, 0, true), move(1, 140, 100), up(1, 60), ...tap(2, 200)]).actions)).not.toContain('reset')
    // The first was a pinch.
    expect(kinds(run([finger(1, 100, 100, 0, true), finger(2, 110, 100), up(2, 40), up(1, 60), ...tap(3, 200)]).actions)).not.toContain('reset')
    // The first was cancelled.
    expect(kinds(run([finger(1, 100, 100, 0, true), cancel(1, 60), ...tap(2, 200)]).actions)).not.toContain('reset')
    // A triple tap is one reset, not two.
    expect(kinds(run([...tap(1, 0), ...tap(2, 200), ...tap(3, 400)]).actions).filter((k) => k === 'reset')).toHaveLength(1)
  })

  it('double-clicks with the mouse too', () => {
    const click = (id: number, at: number): PointerEventIn[] => [mouse(id, 100, 100, at), up(id, at + 60)]
    expect(kinds(run([...click(1, 0), ...click(1, 200)]).actions)).toContain('reset')
  })
})
