'use client'

import { useLayoutEffect } from 'react'
import { useStore } from '@react-three/fiber'

type Frameloop = 'always' | 'demand' | 'never'

/** The part of react-three-fiber's store this needs: its loop mode, its clock, and a way to ask for a frame. */
export interface PauseStore {
  getState(): {
    frameloop: Frameloop
    clock: { elapsedTime: number; getElapsedTime(): number }
    setFrameloop(frameloop: Frameloop): void
    invalidate(): void
    internal: { frames: number }
  }
}

/**
 * Stops drawing while the tab is hidden, and carries on from where it left off.
 *
 * Browsers stop animation frames in a hidden tab, but not every way of being
 * out of sight (a covered window, a hidden tab in an embedded view) and not
 * the frames drawn straight after a resize, so the loop is stopped here, on
 * `visibilitychange`, rather than left to the browser.
 *
 * react-three-fiber's `setFrameloop` is how the loop is stopped and started,
 * and it zeroes the clock as it does. The clock is what `useFrame` measures
 * its steps by and what the shooting stars schedule on, so the time the world
 * had run is put back after, and the clock starts afresh from now: the first
 * frame after a pause sees one frame's worth of time, not the time away, and
 * nothing jumps or catches up. It then asks for a frame, in case the loop had
 * wound down while paused. Starts paused if the tab is already hidden.
 * Returns the unsubscribe, which leaves the loop running.
 */
export function pauseWhenHidden(store: PauseStore, doc: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>): () => void {
  let resumeTo: Frameloop | null = null
  let elapsed = 0

  const resume = () => {
    if (resumeTo === null) return
    const { clock, setFrameloop, invalidate } = store.getState()
    const to = resumeTo
    resumeTo = null
    setFrameloop(to)
    clock.elapsedTime = elapsed
    invalidate()
  }
  const pause = () => {
    const state = store.getState()
    if (resumeTo !== null || state.frameloop === 'never') return
    resumeTo = state.frameloop
    elapsed = state.clock.getElapsedTime()
    // A frame already asked for (`invalidate`) would still run once from the rAF callback that is queued, and in
    // `never` mode that frame sets the clock from the rAF timestamp; none is wanted while paused.
    state.internal.frames = 0
    state.setFrameloop('never')
  }
  const follow = () => (doc.hidden ? pause() : resume())

  doc.addEventListener('visibilitychange', follow)
  follow()
  return () => {
    doc.removeEventListener('visibilitychange', follow)
    resume()
  }
}

/** Inside the canvas: no frames while the tab is hidden (see `pauseWhenHidden`). */
export function PauseWhenHidden() {
  const store = useStore()
  useLayoutEffect(() => pauseWhenHidden(store, document), [store])
  return null
}
