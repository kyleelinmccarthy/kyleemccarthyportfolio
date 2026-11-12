import { Color } from 'three'
import type { SkyLook } from '@/content/types'
import { PHONE_WIDTH } from './quality'

/** Every colour in a look, in the order the look test lists them. */
export const lookColorKeys = [
  'top', 'mid', 'bot', 'sunCol', 'shade', 'lit', 'rim', 'atmo',
  'cloudLit', 'cloudShade', 'deep', 'sea', 'shallow', 'glint', 'city',
] as const satisfies ReadonlyArray<keyof SkyLook>

/** Every number in a look. */
export const lookNumberKeys = ['sunK', 'moonK', 'star', 'rimK', 'sunY', 'glow'] as const satisfies ReadonlyArray<keyof SkyLook>

export type LookColorKey = (typeof lookColorKeys)[number]
export type LookNumberKey = (typeof lookNumberKeys)[number]

/** A look as the renderer uses it: colours parsed into linear space, numbers as they are. */
export interface LookState {
  colors: Record<LookColorKey, Color>
  numbers: Record<LookNumberKey, number>
}

/** How fast the world eases from one look to the next, per second (the look test's rate). */
const EASE_RATE = 2.4

/** A fresh state for one look. `Color` turns each sRGB hex into the linear working space. */
export function toLookState(look: SkyLook): LookState {
  const colors = {} as Record<LookColorKey, Color>
  for (const key of lookColorKeys) colors[key] = new Color(look[key])
  const numbers = {} as Record<LookNumberKey, number>
  for (const key of lookNumberKeys) numbers[key] = look[key]
  return { colors, numbers }
}

/** Moves `current` the fraction `k` of the way to `goal`; at k = 1 it arrives exactly. Mutates `current`. */
export function easeLook(current: LookState, goal: LookState, k: number): void {
  const arrive = k >= 1
  for (const key of lookColorKeys) {
    if (arrive) current.colors[key].copy(goal.colors[key])
    else current.colors[key].lerp(goal.colors[key], k)
  }
  for (const key of lookNumberKeys) {
    const from = current.numbers[key]
    current.numbers[key] = arrive ? goal.numbers[key] : from + (goal.numbers[key] - from) * k
  }
}

/**
 * The key light's colour, written into `out`. Ambient light is the shade
 * colour, so shadows are tinted rather than grey; the key light is whatever
 * lifts the shade up to full light (`lit - shade`), never below black.
 */
export function keyLight(lit: Color, shade: Color, out: Color): Color {
  return out.setRGB(Math.max(0, lit.r - shade.r), Math.max(0, lit.g - shade.g), Math.max(0, lit.b - shade.b))
}

/** The sun's and moon's disc radius, as a share of the screen's height at full size (the sky shader's 0.05). */
export const SUN_DISC = 0.05
/**
 * Where the sun or moon sits across the screen (0 left, 1 right): clear of
 * the panel when one is open on a wide screen. On a phone held upright it sits
 * at `phoneY` up the screen, whatever the hour, below the header block and
 * above the planet.
 */
const SUN = { x: { open: 0.56, clear: 0.8 }, phoneY: 0.74 } as const

/**
 * The sun's (or moon's) place on the screen, as the sky shader takes it: `x`
 * and `y` from the bottom left, 0 to 1, and `size`, its scale. The sky draws
 * it a fixed share of the screen's height, so on a tall phone it would be
 * twice as big beside the planet as on a desktop; it scales with the
 * screen's narrower side instead (the height on a desktop, the width on an
 * upright phone), which keeps it the size it is beside the planet. On an
 * upright phone it also sits at one height for every look, clear of the
 * header and of the planet.
 */
export function sunPlacement({ width, height, placeOpen, sunY }: { width: number; height: number; placeOpen: boolean; sunY: number }): {
  x: number
  y: number
  size: number
} {
  const aspect = width > 0 && height > 0 ? width / height : 1
  const phone = width <= PHONE_WIDTH && aspect < 1
  return {
    x: placeOpen && width > PHONE_WIDTH ? SUN.x.open : SUN.x.clear,
    y: phone ? SUN.phoneY : sunY,
    size: Math.min(1, aspect),
  }
}

/** The fraction of the remaining way to cover in `seconds`: frame-rate independent. */
export function easeAmount(seconds: number): number {
  return 1 - Math.exp(-seconds * EASE_RATE)
}
