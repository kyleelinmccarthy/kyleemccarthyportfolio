import { describe, it, expect, vi } from 'vitest'
import { drawOnResize, type ResizeStore } from '@/components/world/DrawOnResize'

/** A store shaped like react-three-fiber's: state with size and pixel ratio, and a subscription. */
function fakeStore(width = 1440, height = 900, dpr = 2) {
  const listeners = new Set<() => void>()
  const advance = vi.fn()
  let state = { size: { width, height }, viewport: { dpr }, advance, frameloop: 'always' as 'always' | 'never' }
  const store: ResizeStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const set = (next: Partial<{ width: number; height: number; dpr: number; frameloop: 'always' | 'never' }>) => {
    state = {
      ...state,
      size: { width: next.width ?? state.size.width, height: next.height ?? state.size.height },
      viewport: { dpr: next.dpr ?? state.viewport.dpr },
      frameloop: next.frameloop ?? state.frameloop,
    }
    for (const l of listeners) l()
  }
  return { store, set, advance }
}

/** Lets queued microtasks run, as they do before the browser next composites. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('drawing straight after a resize', () => {
  it('draws a frame in the same task when the pixel ratio drops, as it does when quality falls to low', async () => {
    const { store, set, advance } = fakeStore()
    drawOnResize(store)
    set({ dpr: 1.25 })
    expect(advance).not.toHaveBeenCalled()
    await flush()
    expect(advance).toHaveBeenCalledTimes(1)
  })

  it('draws when the canvas changes size, and only once for one change', async () => {
    const { store, set, advance } = fakeStore()
    drawOnResize(store)
    set({ width: 1400 })
    await flush()
    set({ width: 1400 })
    await flush()
    expect(advance).toHaveBeenCalledTimes(1)
  })

  it('leaves every other change of state alone', async () => {
    const { store, set, advance } = fakeStore()
    drawOnResize(store)
    set({})
    await flush()
    expect(advance).not.toHaveBeenCalled()
  })

  it('draws nothing while the loop is paused, as it is when the tab is hidden', async () => {
    const { store, set, advance } = fakeStore()
    drawOnResize(store)
    set({ frameloop: 'never' })
    set({ dpr: 1.25 })
    await flush()
    expect(advance).not.toHaveBeenCalled()
  })

  it('does not draw later for a resize it skipped while paused', async () => {
    const { store, set, advance } = fakeStore()
    drawOnResize(store)
    set({ frameloop: 'never' })
    set({ width: 1000 })
    set({ frameloop: 'always' })
    await flush()
    expect(advance).not.toHaveBeenCalled()
  })

  it('stops when unsubscribed, even with a frame already queued', async () => {
    const { store, set, advance } = fakeStore()
    const stop = drawOnResize(store)
    set({ dpr: 1 })
    stop()
    await flush()
    expect(advance).not.toHaveBeenCalled()
    set({ dpr: 2 })
    await flush()
    expect(advance).not.toHaveBeenCalled()
  })
})
