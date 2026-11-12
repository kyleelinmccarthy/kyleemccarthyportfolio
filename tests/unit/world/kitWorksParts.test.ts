import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { SIGNAL, signalAge, signalBand, signalFade, signalMesh, signalRings, signalStrength, stripeCount, stripedMeshes, turnedMesh, type Point2 } from '@/lib/world/kit'

/** The kit parts added for The Works: rings of light sent out from a mast, and a turned shape in stripes. */

describe('a turned shape in stripes', () => {
  const TENT: Point2[] = [[0, 0], [0.5, 0], [0.5, 0.4], [0.2, 0.7], [0, 0.8]]
  const triangles = (index?: Uint32Array) => (index ? index.length / 3 : 0)

  it('is the turned shape, its surface parted between two colours in an even number of gores', () => {
    const { whole, gores } = stripedMeshes(TENT, 24, 0.02, 8)
    expect(gores).toHaveLength(2)
    // Every triangle of the shape is in exactly one of the two, half in each.
    expect(triangles(gores[0].index) + triangles(gores[1].index)).toBe(triangles(whole.index))
    expect(triangles(gores[0].index)).toBe(triangles(gores[1].index))
    const all = [...Array.from(gores[0].index!), ...Array.from(gores[1].index!)].sort((a, b) => a - b)
    expect(all).toEqual(Array.from(whole.index!).sort((a, b) => a - b))
    // Its sides are a whole number for each gore, so every border between them runs straight up a seam of the lathe.
    expect(whole.positions.length).toBe(turnedMesh(TENT, 24, 0.02).positions.length)
  })

  it('alternates the colours round it, a gore of the first colour centred on the front', () => {
    const { gores } = stripedMeshes(TENT, 24, 0.02, 8)
    // Which gore each triangle's middle falls in, round from the front (+Z).
    const sectors = (part: { positions: Float32Array; index?: Uint32Array }) => {
      const out = new Set<number>()
      const ids = part.index!
      for (let t = 0; t < ids.length; t += 3) {
        let x = 0
        let z = 0
        const p = [0, 1, 2].map((c) => new Vector3().fromArray(part.positions, ids[t + c] * 3))
        // A triangle with no area (two corners on the axis) has no side of its own.
        if (p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).length() < 1e-9) continue
        for (const v of p) {
          x += v.x
          z += v.z
        }
        const a = (Math.atan2(x, z) + Math.PI * 2 + Math.PI / 8) % (Math.PI * 2)
        out.add(Math.floor(a / (Math.PI / 4)))
      }
      return [...out].sort()
    }
    expect(sectors(gores[0])).toEqual([0, 2, 4, 6])
    expect(sectors(gores[1])).toEqual([1, 3, 5, 7])
  })

  it('keeps its gores even in number, from two to its most', () => {
    expect(stripeCount(8)).toBe(8)
    expect(stripeCount(7)).toBe(8)
    expect(stripeCount(0)).toBe(2)
    expect(stripeCount(-4)).toBe(2)
    expect(stripeCount(NaN)).toBe(8)
    expect(stripeCount(1e9)).toBe(32)
  })

  it('draws nothing for a profile with nothing to turn', () => {
    const { whole, gores } = stripedMeshes([[0, 0], [0, 1]], 24, 0.02, 8)
    expect(whole.positions.length).toBe(0)
    for (const g of gores) expect(g.positions.length).toBe(0)
  })
})

describe('rings of light (a signal)', () => {
  it('is one square a ring, standing flat round its origin, `radius` out each way, facing +Z', () => {
    const mesh = signalMesh(1.1, 3)
    expect(mesh.positions.length / 3).toBe(12)
    expect(mesh.index!.length).toBe(18)
    for (let i = 0; i < 12; i++) {
      expect(Math.abs(mesh.positions[i * 3])).toBeCloseTo(1.1, 6)
      expect(Math.abs(mesh.positions[i * 3 + 1])).toBeCloseTo(1.1, 6)
      expect(mesh.positions[i * 3 + 2]).toBe(0)
      expect([mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2]]).toEqual([0, 0, 1])
      // Each corner says where it is across its square, -1 to 1, for the shader to draw the ring from.
      expect(Math.abs(mesh.corner[i * 2])).toBe(1)
      expect(Math.abs(mesh.corner[i * 2 + 1])).toBe(1)
    }
    // The rings are spread evenly through one period: each square starts a third of the way after the last.
    expect([mesh.ring[0], mesh.ring[4], mesh.ring[8]]).toEqual([0, 1 / 3, 2 / 3].map((x) => Math.fround(x)))
    expect(Array.from(mesh.bevel).every((b) => b === 0)).toBe(true)
  })

  it('draws nothing with no radius, and keeps its ring count between one and its most', () => {
    expect(signalMesh(0, 3).positions.length).toBe(0)
    expect(signalMesh(NaN, 3).positions.length).toBe(0)
    expect(signalMesh(-1, 3).positions.length).toBe(0)
    expect(signalMesh(1, 0).positions.length / 12).toBe(1)
    expect(signalMesh(1, 1e9).positions.length / 12).toBe(SIGNAL.most)
    expect(signalMesh(1, NaN).positions.length / 12).toBe(SIGNAL.rings)
    expect(signalMesh(1, 2.6).positions.length / 12).toBe(3)
    // The count it draws is the one its geometry is keyed by, so counts past the cap share one geometry.
    expect(signalRings(5)).toBe(SIGNAL.most)
    expect(signalRings(1e9)).toBe(signalRings(SIGNAL.most + 1))
    expect(signalRings(NaN)).toBe(SIGNAL.rings)
    for (const rings of [0, 2.6, 5, 1e9, NaN]) expect(signalMesh(1, rings).positions.length / 12).toBe(signalRings(rings))
  })

  it('sends each ring out from the mast to its full size once a period, steadily, wrapping without a jump', () => {
    const period = SIGNAL.period
    expect(signalAge(0, period, 0)).toBe(0)
    expect(signalAge(period / 2, period, 0)).toBeCloseTo(0.5, 9)
    expect(signalAge(period / 2, period, 0.25)).toBeCloseTo(0.75, 9)
    // A clock days old gives the same age as one wrapped (the shader's clock is wrapped to the period).
    expect(signalAge(86_400 * 3 + 1.5, period, 0.5)).toBeCloseTo(signalAge((86_400 * 3 + 1.5) % period, period, 0.5), 6)
    for (const t of [NaN, Infinity]) expect(signalAge(t, period, 0)).toBe(0)
    expect(signalAge(3, 0, 0.5)).toBe(0.5)
  })

  it('fades each ring in as it leaves the mast and out to nothing as it reaches its full size, so its wrap never pops', () => {
    expect(signalFade(0)).toBe(0)
    expect(signalFade(1)).toBe(0)
    let most = 0
    let steepest = 0
    for (let k = 0; k <= 1; k += 0.001) {
      const f = signalFade(k)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
      most = Math.max(most, f)
      steepest = Math.max(steepest, Math.abs(signalFade(k + 0.001) - f) / 0.001)
    }
    expect(most).toBeGreaterThan(0.9)
    // The envelope itself changes slowly; what a pixel sees is tested below.
    expect(steepest / SIGNAL.period).toBeLessThan(1)
    for (const k of [NaN, -1, 2]) expect(signalFade(k)).toBe(0)
  })

  /**
   * What one pixel `d` of the way out sees at time `t` with `rings` rings: each
   * ring's strength there (its fade times its band), the strongest of them.
   */
  const pixel = (d: number, t: number, rings: number) => {
    let out = 0
    for (let i = 0; i < rings; i++) {
      const age = signalAge(t, SIGNAL.period, i / rings)
      out = Math.max(out, signalFade(age) * signalBand(d, age))
    }
    return out
  }

  /**
   * How many distinct pulses a pixel sees in one period: a pulse is a rise of
   * at least `step` (WCAG's "10% or more") followed by a fall of as much.
   * Sampled over three periods, counting the pulses that peak in the middle one,
   * so the wrap is seen as the shader draws it.
   */
  const pulses = (d: number, rings: number, step = 0.1) => {
    const dt = 0.005
    const period = SIGNAL.period
    // Looking for a peak: the trough before it and the highest since. Then for the fall after it: the lowest since.
    let rising = true
    let low = pixel(d, 0, rings)
    let high = low
    let peakAt = 0
    let count = 0
    for (let t = dt; t <= period * 3; t += dt) {
      const v = pixel(d, t, rings)
      if (rising) {
        if (v < low) [low, high, peakAt] = [v, v, t]
        if (v > high) [high, peakAt] = [v, t]
        if (high - low >= step && high - v >= step) {
          if (peakAt >= period && peakAt < period * 2) count++
          rising = false
          low = v
        }
      } else {
        if (v < low) low = v
        if (v - low >= step) [rising, high, peakAt] = [true, v, t]
      }
    }
    return count
  }

  it('never flashes at any pixel (WCAG 2.3.1): a pixel sees at most one pulse every two seconds, for every ring count', () => {
    // The limit is three flashes a second; a pixel here sees at most one pulse in two seconds, a sixth of it.
    const MOST_A_SECOND = 0.5
    expect(MOST_A_SECOND * 6).toBeLessThanOrEqual(3)
    // A ring's front crossing a pixel is a real pulse: the test does count it.
    expect(pulses(0.4, 1)).toBe(1)
    for (let rings = 1; rings <= SIGNAL.most; rings++) {
      for (const d of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
        expect(pulses(d, rings) / SIGNAL.period, `${rings} rings at ${d}`).toBeLessThanOrEqual(MOST_A_SECOND)
      }
    }
    // Which is to say the rings are spaced at least two seconds apart, however many are asked for.
    expect(SIGNAL.period / SIGNAL.most).toBeGreaterThanOrEqual(2)
    expect(SIGNAL.period / SIGNAL.rings).toBeGreaterThanOrEqual(2)
  })

  it('draws a ring as a soft line at its front with a fainter glow trailing in behind it, with no hard edge', () => {
    expect(signalBand(0.5, 0.5)).toBe(1)
    expect(signalBand(0.5 + SIGNAL.width, 0.5)).toBe(0)
    expect(signalBand(0.5 - SIGNAL.trail, 0.5)).toBe(0)
    // The trail is wider than the front.
    expect(signalBand(0.5 - SIGNAL.width * 1.5, 0.5)).toBeGreaterThan(0.1)
    expect(signalBand(0.5 + SIGNAL.width * 1.5, 0.5)).toBe(0)
    expect(SIGNAL.trailK).toBeLessThan(0.5)
    for (let d = 0; d <= 1; d += 0.0005) expect(Math.abs(signalBand(d + 0.0005, 0.5) - signalBand(d, 0.5))).toBeLessThan(0.05)
    for (const d of [NaN, Infinity]) expect(signalBand(d, 0.5)).toBe(0)
  })

  it('is a soft pale light by day and a little brighter at night, never strong enough to wash the frame', () => {
    const day = signalStrength(1)
    const night = signalStrength(2)
    expect(day).toEqual({ alpha: SIGNAL.day.alpha, gain: SIGNAL.day.gain })
    expect(night).toEqual({ alpha: SIGNAL.night.alpha, gain: SIGNAL.night.gain })
    expect(night.gain).toBeGreaterThan(day.gain)
    // Over black, its brightest pixel at night is alpha times gain of its colour (0.88 for white), under the bloom's threshold of 1.
    expect(night.alpha * night.gain).toBeLessThan(1)
    expect(day.alpha * day.gain).toBeLessThanOrEqual(1)
    // Over anything brighter (a lit window), blending mixes the two, so a pixel is never brighter than the brighter of
    // its backdrop and the ring's own colour at its gain (1.6 for white): it can bloom a little there, never more.
    for (const behind of [0, 0.5, 1, 2, 3]) {
      for (const a of [0, 0.3, night.alpha]) {
        const seen = a * night.gain + (1 - a) * behind
        expect(seen).toBeLessThanOrEqual(Math.max(behind, night.gain) + 1e-9)
      }
    }
    expect(night.gain).toBeLessThanOrEqual(1.6)
    expect(signalStrength(NaN)).toEqual(day)
  })
})
