import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/*
 * Node 25 and later have a `localStorage` of their own, which is undefined
 * unless Node is started with --localstorage-file, and it hides jsdom's. Put
 * jsdom's back (as a getter, as a browser has it, so a test can make reaching it throw).
 */
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom
if (dom && !globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => dom.window.localStorage })
}

afterEach(() => {
  cleanup()
})
