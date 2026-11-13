/**
 * How much the canvas draws. `high` has bloom and the full pixel ratio; `low`
 * drops bloom and draws fewer pixels, for phones, weak devices and data savers.
 */
export type Quality = 'high' | 'low'

/** The site's phone layout ends here (the `max-[820px]` breakpoint). */
export const PHONE_WIDTH = 820
/** Fewer gigabytes of memory, or fewer cores, than this is a weak device. */
const ENOUGH_MEMORY = 4
const ENOUGH_CORES = 4

/** Frames to judge before dropping quality: about two seconds at 60 fps. */
export const DOWNGRADE_SAMPLES = 120
/** A mean frame longer than this (about 35 fps) is too slow to keep bloom. */
const SLOW_FRAME_MS = 28

/** Chosen once, up front. `deviceMemory` and `cores` are left out where the browser does not report them. */
export function pickQuality(env: { saveData: boolean; deviceMemory?: number; cores?: number; width: number }): Quality {
  if (env.saveData) return 'low'
  if (env.deviceMemory !== undefined && env.deviceMemory < ENOUGH_MEMORY) return 'low'
  if (env.cores !== undefined && env.cores < ENOUGH_CORES) return 'low'
  if (env.width <= PHONE_WIDTH) return 'low'
  return 'high'
}

/** True when the mean of at least 120 frame times exceeds 28 ms. */
export function shouldDowngrade(frameMs: number[]): boolean {
  if (frameMs.length < DOWNGRADE_SAMPLES) return false
  const mean = frameMs.reduce((sum, ms) => sum + ms, 0) / frameMs.length
  return mean > SLOW_FRAME_MS
}

/**
 * What the canvas draws through, given the quality it was made at and the
 * quality it is at now. The browser fixes a canvas's multisampling when its
 * context is created, so a canvas made for `high` has none of its own (its
 * bloom target is the multisampled one) and one made for `low` has it.
 *
 * - `bloom`: the composer, with its multisampled target and the bloom (high).
 * - `multisample`: the same target, without the bloom. A canvas made for
 *   `high` that has dropped to `low` keeps it, so the edges stay smooth
 *   without recreating the canvas (which would lose the view and flash).
 * - `none`: straight to the canvas, which is multisampled (made for `low`).
 */
export function postProcessing(made: Quality, now: Quality): 'bloom' | 'multisample' | 'none' {
  if (made === 'low') return 'none'
  return now === 'high' ? 'bloom' : 'multisample'
}

declare global {
  interface Window {
    /** A test hook: scales the canvas's pixel ratio. See `hookedRenderScale`. Honoured only in an e2e build. */
    __worldRenderScale?: number
    /** A test hook: the number of frames the world has drawn. Counted only in an e2e build. */
    __worldFrames?: number
    /**
     * A test hook: at a place, the camera's swing, tilt (radians) and distance from the landmark's middle, and whether it
     * rests at the furthest so a new gesture out would leave (`rigArmed`). Written only in an e2e build.
     */
    __rigView?: { azimuth: number; elevation: number; distance: number; armed: boolean }
    /** A test hook: how many times the map labels have measured the page's layout. Counted only in an e2e build. */
    __labelMeasures?: number
    /**
     * A test hook: draw one character alone instead of the world, for the picker's pictures and for review
     * (`PortraitCanvas`; scripts/capture-characters.ts). Read once, and honoured only in an e2e build.
     */
    __characterPortrait?: { look: 'guide' | { age: string; style: string; skin: string }; sky?: 'morning' | 'afternoon' | 'evening' | 'night'; turn?: number; frame?: number }
  }
}

/**
 * Whether the test hooks (`window.__worldRenderScale`, `window.__worldFrames`)
 * are live. They are, only in a build made with `NEXT_PUBLIC_E2E=1` (the
 * Playwright web server sets it); a normal production build has neither. Pass
 * the flag as `process.env.NEXT_PUBLIC_E2E`, written out in full so the build
 * can inline it.
 */
export function testHooksOn(flag: string | undefined): boolean {
  return flag === '1'
}

/** The smallest and largest scale the canvas's pixel ratio takes from the test hook. */
const RENDER_SCALE = { min: 0.25, max: 1 }

/** The scale handed in through `window.__worldRenderScale`, kept within 0.25 to 1. Anything that is not a number counts as 1. */
export function renderScale(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return RENDER_SCALE.max
  return Math.min(RENDER_SCALE.max, Math.max(RENDER_SCALE.min, value))
}

/** The pixel-ratio scale to draw at: the hook's `value` (see `renderScale`) in an e2e build, otherwise always 1. */
export function hookedRenderScale(flag: string | undefined, value: unknown): number {
  return testHooksOn(flag) ? renderScale(value) : RENDER_SCALE.max
}
