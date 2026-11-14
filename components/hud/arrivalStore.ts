'use client'

import { useSyncExternalStore } from 'react'
import { ARRIVAL_AT_ATTR, ARRIVAL_ATTR, nextStageAt, stageAt, type ArrivalStage } from '@/lib/arrival'

/*
 * The arrival as it plays on this page, outside React's tree so the HUD and
 * the canvas (which React context does not reach) read the one clock. The
 * page's init script decides whether it plays and when it began
 * (`arrivalInitScript`); this reads that once, moves the stage on at the
 * timeline's times (a handful of updates, never one a frame), and ends it,
 * when its time is up or the visitor skips it, by taking the mark off <html>.
 */

let begun = false
/** When it began (`performance.now()` ms), or null when it is not playing. */
let startedAt: number | null = null
let stage: ArrivalStage = 'done'
let timer: number | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Ends it: the world at rest and the page as it always is. */
function end() {
  window.clearTimeout(timer)
  startedAt = null
  stage = 'done'
  document.documentElement.removeAttribute(ARRIVAL_ATTR)
}

/** Moves to the stage for now, and waits for the next. Silent: the caller says whether to tell anyone. */
function step() {
  if (startedAt === null) return
  const ms = performance.now() - startedAt
  const next = nextStageAt(ms)
  stage = stageAt(ms)
  if (next === null) end()
  else
    timer = window.setTimeout(() => {
      step()
      emit()
    }, next - ms)
}

/** Reads, once, whether the page's init script started it, and how long ago. Never on the server. */
function begin() {
  if (begun || typeof document === 'undefined') return
  begun = true
  const html = document.documentElement
  if (html.getAttribute(ARRIVAL_ATTR) !== 'play') return
  const at = Number(html.getAttribute(ARRIVAL_AT_ATTR))
  startedAt = Number.isFinite(at) ? at : performance.now()
  step()
}

export const arrival = {
  subscribe(listener: () => void) {
    begin()
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** The stage now: `done` when it is not playing (and on the server). */
  stage(): ArrivalStage {
    begin()
    return stage
  },
  /** How far into it `now` (`performance.now()` ms) is; Infinity when it is not playing, so everything reads as at rest. */
  elapsed(now: number): number {
    if (!begun) begin()
    return startedAt === null ? Number.POSITIVE_INFINITY : now - startedAt
  },
  /** Skips to the end. Does nothing once it is over. */
  skip() {
    begin()
    if (startedAt === null) return
    end()
    emit()
  },
}

/** The arrival's stage, for a component: it re-renders only when the stage changes. */
export function useArrivalStage(): ArrivalStage {
  return useSyncExternalStore(arrival.subscribe, arrival.stage, () => 'done')
}
