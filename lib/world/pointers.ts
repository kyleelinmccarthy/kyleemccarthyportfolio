import { isDoubleTap, pinchZoom, type Tap } from './gestures'
import { isClick } from './rig'

/*
 * The pointers on the canvas at a place, as a pure state machine: what each
 * pointer event does to the camera (a drag, a pinch's zoom, a double tap's
 * reset) and which pointers the canvas should capture or let go. CameraRig
 * feeds it the DOM's pointer events and does what it says.
 *
 * One pointer drags. Two fingers pinch: only touch pointers pinch, so a mouse
 * button held while a finger is down (or the other way round) is ignored, as
 * is a third finger. A pointer whose lift never arrives (a system gesture, an
 * alert, lost capture) cannot linger and turn the next drag into a pinch: a
 * new touch sequence (its first finger is the primary one) drops any touches
 * still held, and `clear` drops everything.
 */

/** One pointer being followed: its id, where it last was, and whether it is a finger. */
export interface Tracked {
  id: number
  x: number
  y: number
  touch: boolean
}

export interface PointerState {
  tracked: Tracked[]
  /** The gesture under way: where and when it began, how far its pointers have moved, and whether a second finger joined. */
  gesture: { tap: Tap; moved: number; pinched: boolean } | null
  /** The last gesture, if it was a tap: where it was and when it lifted, for a double tap. */
  lastTap: Tap | null
}

export const POINTERS_START: PointerState = { tracked: [], gesture: null, lastTap: null }

/** A pointer event, as the canvas hands it over. `t` is in milliseconds. `primary` is the DOM's `isPrimary`. */
export type PointerEventIn =
  | {
      type: 'down'
      id: number
      x: number
      y: number
      t: number
      kind: 'mouse' | 'touch' | 'pen'
      primary: boolean
      button: number
      /**
       * A press that began on a map label and was handed to the map late (`useLabelGestures`), once it moved past a
       * click's slop: it may be primary, but it is not the first finger of a new touch, so it never drops the others.
       */
      handedOver?: boolean
    }
  | { type: 'move'; id: number; x: number; y: number }
  | { type: 'up'; id: number; t: number; cancel: boolean }
  /** Let every pointer go: the window lost focus, the page was hidden, capture was lost, or the camera left the place. */
  | { type: 'clear' }

/** What the canvas should do: move the camera, or take or let go of a pointer. */
export type PointerAction =
  | { type: 'drag'; dx: number; dy: number }
  | { type: 'zoom'; scale: number }
  | { type: 'reset' }
  | { type: 'capture'; id: number }
  | { type: 'release'; id: number }

/**
 * Whether a press that began on a map label belongs to the map, having moved `moved` pixels with `othersDown`
 * other pointers already down: once it has moved further than a click may, or at once if it is the second finger
 * of a pinch. Until then it is a tap on the label, which follows its link.
 */
export function labelPressIsTheMaps(moved: number, othersDown: number): boolean {
  return othersDown > 0 || !isClick(moved)
}

const spread = (tracked: Tracked[]) => (tracked.length >= 2 ? Math.hypot(tracked[0].x - tracked[1].x, tracked[0].y - tracked[1].y) : 0)

export function pointerReduce(state: PointerState, event: PointerEventIn): { state: PointerState; actions: PointerAction[] } {
  const none = { state, actions: [] as PointerAction[] }
  switch (event.type) {
    case 'clear':
      return { state: POINTERS_START, actions: state.tracked.map((p) => ({ type: 'release' as const, id: p.id })) }

    case 'down': {
      const touch = event.kind === 'touch'
      if (!touch && event.button !== 0) return none
      let tracked = state.tracked
      let gesture = state.gesture
      const actions: PointerAction[] = []
      // The first finger of a new touch: any touch still held is one whose lift was lost. A finger handed over by a
      // label is not one (it went down before the fingers the map already holds).
      if (touch && event.primary && !event.handedOver && tracked.some((p) => p.touch)) {
        for (const p of tracked.filter((q) => q.touch)) actions.push({ type: 'release', id: p.id })
        tracked = tracked.filter((p) => !p.touch)
        gesture = tracked.length > 0 ? gesture : null
      }
      if (tracked.some((p) => p.id === event.id)) return none
      // Only fingers pinch, and only two of them.
      if (tracked.length > 0 && (!touch || tracked.some((p) => !p.touch) || tracked.length >= 2)) return { state: { ...state, tracked, gesture }, actions }
      tracked = [...tracked, { id: event.id, x: event.x, y: event.y, touch }]
      actions.push({ type: 'capture', id: event.id })
      gesture =
        tracked.length === 1 || !gesture
          ? { tap: { x: event.x, y: event.y, t: event.t }, moved: 0, pinched: tracked.length > 1 }
          : { ...gesture, pinched: true }
      return { state: { ...state, tracked, gesture }, actions }
    }

    case 'move': {
      const was = state.tracked.find((p) => p.id === event.id)
      if (!was) return none
      const before = spread(state.tracked)
      const tracked = state.tracked.map((p) => (p.id === event.id ? { ...p, x: event.x, y: event.y } : p))
      const gesture = state.gesture ? { ...state.gesture, moved: state.gesture.moved + Math.hypot(event.x - was.x, event.y - was.y) } : null
      const actions: PointerAction[] =
        tracked.length === 1 ? [{ type: 'drag', dx: event.x - was.x, dy: event.y - was.y }] : [{ type: 'zoom', scale: pinchZoom(before, spread(tracked)) }]
      return { state: { ...state, tracked, gesture }, actions }
    }

    case 'up': {
      if (!state.tracked.some((p) => p.id === event.id)) return none
      const tracked = state.tracked.filter((p) => p.id !== event.id)
      const actions: PointerAction[] = [{ type: 'release', id: event.id }]
      if (tracked.length > 0 || !state.gesture) return { state: { ...state, tracked }, actions }
      // The gesture is over: was it a tap, and the second of two?
      const { tap, moved, pinched } = state.gesture
      if (event.cancel || pinched || !isClick(moved)) return { state: { tracked, gesture: null, lastTap: null }, actions }
      if (isDoubleTap(state.lastTap, tap)) return { state: { tracked, gesture: null, lastTap: null }, actions: [...actions, { type: 'reset' }] }
      return { state: { tracked, gesture: null, lastTap: { ...tap, t: event.t } }, actions }
    }
  }
}
