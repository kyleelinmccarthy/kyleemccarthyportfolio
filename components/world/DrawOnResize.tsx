'use client'

import { useLayoutEffect } from 'react'
import { useStore } from '@react-three/fiber'

/** The part of react-three-fiber's store this needs: the canvas's size and pixel ratio, and a way to draw a frame. */
export interface ResizeStore {
  getState(): {
    size: { width: number; height: number }
    viewport: { dpr: number }
    frameloop: string
    advance(timestamp: number): void
  }
  subscribe(listener: () => void): () => void
}

/**
 * Draws a frame as soon as the canvas is resized, in the same task.
 *
 * react-three-fiber resizes the renderer from a store subscription whenever
 * the canvas's size or pixel ratio changes, and resizing a canvas clears it.
 * When the change comes from outside an animation frame (a React commit, as
 * when the world drops to low quality and its pixel ratio falls, or a resize
 * observer) nothing is drawn until the next frame, and the browser can show
 * the empty canvas in between: the page's background flashes through where
 * the world should be. On a slow device that is a visible blink; under
 * software rendering a capture can catch it outright.
 *
 * This subscribes after react-three-fiber's own resize (it is set up when the
 * root is created, before any component), and draws a frame in a microtask, so
 * the new canvas has content before the browser next composites. Returns the
 * unsubscribe.
 *
 * While the loop is paused (see `PauseWhenHidden`) it draws nothing: a hidden tab
 * is not drawn to, and the loop draws as it starts again.
 */
export function drawOnResize(store: ResizeStore): () => void {
  let { width, height } = store.getState().size
  let dpr = store.getState().viewport.dpr
  let live = true
  const unsubscribe = store.subscribe(() => {
    const state = store.getState()
    if (state.size.width === width && state.size.height === height && state.viewport.dpr === dpr) return
    ;({ width, height } = state.size)
    dpr = state.viewport.dpr
    // Paused (the tab is hidden): nothing is drawn, and the loop draws a frame when it starts again.
    if (state.frameloop === 'never') return
    queueMicrotask(() => {
      if (live && store.getState().frameloop !== 'never') store.getState().advance(performance.now())
    })
  })
  return () => {
    live = false
    unsubscribe()
  }
}

/** Inside the canvas: keeps a resize from ever leaving the canvas empty for a frame (see `drawOnResize`). */
export function DrawOnResize() {
  const store = useStore()
  useLayoutEffect(() => drawOnResize(store), [store])
  return null
}
