/** Seed for everything that is placed at random on the planet, so the world is the same on every visit. */
export const WORLD_SEED = 20261110

/** Small seeded generator; each call returns a number in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const h3 = (x: number, y: number, z: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const fade = (f: number) => f * f * (3 - 2 * f)

/** Value noise in [-1, 1]. Place positions were chosen against this exact function; do not change it. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = fade(x - xi)
  const yf = fade(y - yi)
  const zf = fade(z - zi)
  const a = lerp(
    lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), xf),
    lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), xf),
    yf,
  )
  const b = lerp(
    lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), xf),
    lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), xf),
    yf,
  )
  return lerp(a, b, zf) * 2 - 1
}
