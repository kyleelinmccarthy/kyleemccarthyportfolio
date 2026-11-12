import type { ReactNode } from 'react'
import { _roots, act, createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import type { Object3D } from 'three'

// What <Canvas> does for an app: make three's classes available as JSX elements.
extend(THREE as never)

/**
 * A stand-in for WebGLRenderer: react-three-fiber needs a renderer to build a
 * scene, but these tests only look at the scene graph, never at pixels. Any
 * method it calls does nothing. It must not look like a promise (no `then`),
 * or react-three-fiber waits for it to resolve.
 */
function stubRenderer() {
  const target: Record<string | symbol, unknown> = {
    render() {},
    setSize() {},
    setPixelRatio() {},
    getPixelRatio: () => 1,
    domElement: document.createElement('canvas'),
    shadowMap: {},
    xr: { enabled: false, isPresenting: false, addEventListener() {}, removeEventListener() {}, setAnimationLoop() {} },
    info: { render: {} },
    capabilities: { getMaxAnisotropy: () => 1 },
    dispose() {},
  }
  return new Proxy(target, {
    get: (t, key) => (key in t ? t[key] : key === 'then' ? undefined : () => undefined),
    set: (t, key, value) => {
      t[key] = value
      return true
    },
  })
}

/** Lets queued microtasks (and the batcher's merge) run. */
export const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Mounts `element` with react-three-fiber, as the app does inside its
 * <Canvas>, and returns the scene, a way to render a new element in its place
 * (as Fast Refresh does), and a way to unmount.
 */
export async function mount(element: ReactNode) {
  const canvas = document.createElement('canvas')
  // react-three-fiber's store builds a THREE.Clock, which three now warns is deprecated: known, and not these tests' business.
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    if (!String(args[0]).startsWith('THREE.Clock')) warn(...args)
  }
  let root: ReturnType<typeof createRoot>
  try {
    root = createRoot(canvas)
    await root.configure({ gl: stubRenderer() as never, frameloop: 'never', dpr: 1, size: { width: 100, height: 100, top: 0, left: 0 }, events: undefined })
  } finally {
    console.warn = warn
  }
  await act(async () => {
    root.render(element)
  })
  await settle()
  const scene = _roots.get(canvas)!.store.getState().scene as Object3D
  return {
    scene,
    /** Runs one frame (every `useFrame`), as the render loop would. */
    async frame() {
      await act(async () => {
        _roots.get(canvas)!.store.getState().advance(performance.now())
      })
    },
    async rerender(next: ReactNode) {
      await act(async () => {
        root.render(next)
      })
      await settle()
    },
    async unmount() {
      await act(async () => {
        root.unmount()
      })
    },
  }
}
