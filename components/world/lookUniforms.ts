import { Color, Vector2, Vector3 } from 'three'
import { lookColorKeys, lookNumberKeys, type LookColorKey, type LookNumberKey } from '@/lib/world/look'

export interface Uniform<T> {
  value: T
}

/**
 * The uniforms every material in the world reads, shared by reference so one
 * write reaches them all. `LookDriver` is the only writer: it eases the colours
 * and numbers toward the current look each frame, derives the key light, places
 * the sun, and keeps time.
 * Colours are in linear space, as the shaders and the bloom pass expect.
 */
export const lookUniforms = {
  colors: Object.fromEntries(lookColorKeys.map((key) => [key, { value: new Color() }])) as Record<
    LookColorKey,
    Uniform<Color>
  >,
  numbers: Object.fromEntries(lookNumberKeys.map((key) => [key, { value: 0 }])) as Record<LookNumberKey, Uniform<number>>,
  /** The key light's colour, `lit - shade`: the directional light and the sea both use it. */
  key: { value: new Color() } as Uniform<Color>,
  /** Where the sun (or moon) sits, as a fraction of the screen from the bottom left. */
  sun: { value: new Vector2(0.8, 0.8) } as Uniform<Vector2>,
  /** How big the sun (or moon) is drawn, 1 at full size (see `sunPlacement`). */
  sunSize: { value: 1 } as Uniform<number>,
  /** Seconds of ambient animation. It stands still under reduced motion. */
  time: { value: 0 } as Uniform<number>,
  /** The direction the sea's highlights, its cel bands and the clouds are lit from, in view space. Fixed. */
  lightView: { value: new Vector3(0.55, 0.6, 0.58).normalize() } as Uniform<Vector3>,
}
