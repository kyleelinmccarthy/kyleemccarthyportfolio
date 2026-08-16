import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no IntersectionObserver; framer-motion's useInView (which
// RevealOnActive and other components rely on outside the journey's own
// SceneActiveContext) needs one to exist just to mount without throwing.
if (!('IntersectionObserver' in globalThis)) {
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }
}

afterEach(() => {
  cleanup()
})
