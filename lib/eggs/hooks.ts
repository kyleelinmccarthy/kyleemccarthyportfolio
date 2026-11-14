import type { LatLon } from '@/content/types'
import { testHooksOn } from '@/lib/world/quality'

/*
 * The eggs' test hooks, live only in an e2e build (`testHooksOn`). The bug
 * wanders, so it is left out of the e2e suite's world unless a test asks for
 * it (`window.__eggBug`), where it cannot walk under a spot another test
 * presses; a test that asks for it can say where it appears and reads where it
 * is on the screen. A test can also say what the next roll will be.
 */

declare global {
  interface Window {
    /** A test hook: the bug is on in an e2e build only while this is set; `at`, if given, is where it appears (the nearest walkable spot). */
    __eggBug?: { at?: LatLon }
    /** A test hook: where the bug's middle is on the screen (CSS pixels), and whether it is on the near side of the planet. Written each frame. */
    __eggBugScreen?: { x: number; y: number; front: boolean }
    /** A test hook: the next roll comes up this (1 to 20), once. */
    __eggRoll?: number
  }
}

/** Whether the bug is out at all: always in a normal build; in an e2e build only when a test has asked for it (`hook`). */
export function bugOn(flag: string | undefined, hook: Window['__eggBug']): boolean {
  return !testHooksOn(flag) || hook !== undefined
}

/** Where a test asked the bug to appear, in an e2e build; nowhere in particular otherwise. */
export function bugAt(flag: string | undefined, hook: Window['__eggBug']): LatLon | undefined {
  return testHooksOn(flag) ? hook?.at : undefined
}

/** The roll a test asked for, in an e2e build (taken once); otherwise none. */
export function takeRiggedRoll(flag: string | undefined, win: Pick<Window, '__eggRoll'> | undefined): number | null {
  if (!testHooksOn(flag) || !win || win.__eggRoll === undefined) return null
  const value = win.__eggRoll
  win.__eggRoll = undefined
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
