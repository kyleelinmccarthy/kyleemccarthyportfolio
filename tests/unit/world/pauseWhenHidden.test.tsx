import { afterEach, describe, it, expect, vi } from 'vitest'
import { useStore } from '@react-three/fiber'
import { pauseWhenHidden, type PauseStore } from '@/components/world/PauseWhenHidden'
import { mount } from './r3f'

/** Hides or shows the tab, as the browser does: the property changes, then the event fires. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  vi.restoreAllMocks()
  setHidden(false)
})

/** A store shaped like react-three-fiber's, for the order of calls. */
function fakeStore(frameloop: 'always' | 'demand' | 'never' = 'always') {
  const state = {
    frameloop,
    clock: { elapsedTime: 12, getElapsedTime: () => state.clock.elapsedTime },
    setFrameloop: vi.fn((next: typeof frameloop) => {
      state.frameloop = next
      // As react-three-fiber does: the clock starts again from nothing.
      state.clock.elapsedTime = 0
    }),
    invalidate: vi.fn(),
    internal: { frames: 0 },
  }
  const store: PauseStore = { getState: () => state }
  return { store, state }
}

describe('pausing while the tab is hidden', () => {
  it('stops the loop when the tab is hidden and restarts it when it is shown', () => {
    const { store, state } = fakeStore()
    const stop = pauseWhenHidden(store, document)
    expect(state.frameloop).toBe('always')
    setHidden(true)
    expect(state.frameloop).toBe('never')
    expect(state.invalidate).not.toHaveBeenCalled()
    setHidden(false)
    expect(state.frameloop).toBe('always')
    // Asks for a frame, so the loop starts again even if the browser's own callback had stopped.
    expect(state.invalidate).toHaveBeenCalledTimes(1)
    stop()
  })

  it('drops a frame already asked for, so none runs while paused', () => {
    const { store, state } = fakeStore('demand')
    const stop = pauseWhenHidden(store, document)
    state.internal.frames = 1
    setHidden(true)
    expect(state.internal.frames).toBe(0)
    stop()
  })

  it('goes back to the loop it had, not always to a continuous one', () => {
    const { store, state } = fakeStore('demand')
    const stop = pauseWhenHidden(store, document)
    setHidden(true)
    setHidden(false)
    expect(state.frameloop).toBe('demand')
    stop()
  })

  it('starts paused when the tab is hidden already', () => {
    setHidden(true)
    const { store, state } = fakeStore()
    const stop = pauseWhenHidden(store, document)
    expect(state.frameloop).toBe('never')
    setHidden(false)
    expect(state.frameloop).toBe('always')
    stop()
  })

  it('ignores repeats: hiding twice changes nothing, and showing a tab that was never hidden does nothing', () => {
    const { store, state } = fakeStore()
    const stop = pauseWhenHidden(store, document)
    setHidden(false)
    expect(state.setFrameloop).not.toHaveBeenCalled()
    setHidden(true)
    setHidden(true)
    expect(state.setFrameloop).toHaveBeenCalledTimes(1)
    setHidden(false)
    setHidden(false)
    expect(state.setFrameloop).toHaveBeenCalledTimes(2)
    stop()
  })

  it('stops listening when unsubscribed', () => {
    const { store, state } = fakeStore()
    const stop = pauseWhenHidden(store, document)
    stop()
    setHidden(true)
    expect(state.setFrameloop).not.toHaveBeenCalled()
  })

  it('leaves the loop running if it is unsubscribed while hidden (the world is going away)', () => {
    const { store, state } = fakeStore()
    const stop = pauseWhenHidden(store, document)
    setHidden(true)
    stop()
    expect(state.frameloop).toBe('always')
  })
})

describe('the clock across a pause, with react-three-fiber itself', () => {
  it('keeps the time the world has run and starts the next frame from now, not from before the pause', async () => {
    let store!: ReturnType<typeof useStore>
    function Grab() {
      store = useStore()
      return null
    }
    const app = await mount(<Grab />)
    const now = vi.spyOn(performance, 'now')
    now.mockReturnValue(1_000)
    store.getState().setFrameloop('demand')
    const stop = pauseWhenHidden(store, document)

    now.mockReturnValue(3_000)
    // A frame asked for just before the tab was hidden: its queued callback would still run once in `never` mode,
    // where react-three-fiber sets the clock from the animation timestamp.
    store.getState().internal.frames = 1
    setHidden(true)
    expect(store.getState().frameloop).toBe('never')
    expect(store.getState().internal.frames).toBe(0)

    // An hour in a background tab.
    now.mockReturnValue(3_603_000)
    setHidden(false)
    const { clock } = store.getState()
    expect(clock.elapsedTime).toBeCloseTo(2, 5)
    expect(store.getState().frameloop).toBe('demand')

    // The first frame after the pause sees one frame's worth of time, not an hour of catching up.
    now.mockReturnValue(3_603_016)
    expect(clock.getDelta()).toBeCloseTo(0.016, 5)
    expect(clock.elapsedTime).toBeCloseTo(2.016, 5)

    stop()
    await app.unmount()
  })
})
