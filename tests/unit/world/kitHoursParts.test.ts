import { describe, it, expect } from 'vitest'
import { DROP, FLAME, GLASS, dropPose, flameBreath, flameOutline, flowerOutline, flameProfile, turnedMesh, type Point2 } from '@/lib/world/kit'
import { FLAME_BREATH_GLSL, flameMaterial } from '@/components/world/materials'

/** The kit parts added for After Hours: a flame that breathes, and a coin's drop into a slot. */

/** How many distinct pulses `f` makes over `seconds`: a rise of at least `step` followed by a fall of as much. */
function pulses(f: (t: number) => number, seconds: number, step: number, dt = 0.005): number {
  let rising = true
  let low = f(0)
  let high = low
  let count = 0
  for (let t = dt; t <= seconds; t += dt) {
    const v = f(t)
    if (rising) {
      if (v < low) [low, high] = [v, v]
      if (v > high) high = v
      if (high - low >= step && high - v >= step) {
        count++
        rising = false
        low = v
      }
    } else {
      if (v < low) low = v
      if (v - low >= step) [rising, high] = [true, v]
    }
  }
  return count
}

/** The quickest `f` changes, per second, sampled every `dt` over `seconds`. */
function steepest(f: (t: number) => number, seconds: number, dt = 0.002): number {
  let most = 0
  for (let t = 0; t < seconds; t += dt) most = Math.max(most, Math.abs(f(t + dt) - f(t)) / dt)
  return most
}

describe('a flame', () => {
  it('is a teardrop turned about its axis: on the axis at its foot and tip, its widest `radius` low down, narrowing to its tip', () => {
    const profile = flameProfile(0.05, 0.16)
    expect(profile[0]).toEqual([0, 0])
    expect(profile[profile.length - 1]).toEqual([0, 0.16])
    const widest = Math.max(...profile.map(([r]) => r))
    expect(widest).toBeCloseTo(0.05)
    const at = profile.findIndex(([r]) => r === widest)
    // Widest in its lower half, then never wider again on the way up.
    expect(profile[at][1]).toBeLessThan(0.08)
    for (let k = at + 1; k < profile.length; k++) expect(profile[k][0]).toBeLessThanOrEqual(profile[k - 1][0])
    for (let k = 1; k < profile.length; k++) expect(profile[k][1]).toBeGreaterThan(profile[k - 1][1])
    // A sound turned shape.
    expect(turnedMesh(profile, 12, 0.005).positions.length).toBeGreaterThan(0)
  })

  it('keeps its bulb within its height for a short squat flame', () => {
    const profile = flameProfile(0.1, 0.1)
    for (let k = 1; k < profile.length; k++) expect(profile[k][1]).toBeGreaterThan(profile[k - 1][1])
    expect(Math.max(...profile.map(([, y]) => y))).toBeCloseTo(0.1)
  })

  it('has a flat outline of the same teardrop for a plate (an emblem), standing on y = 0 round x = 0, anticlockwise', () => {
    const shape = flameOutline(0.1, 0.16)
    const xs = shape.map(([x]) => x)
    const ys = shape.map(([, y]) => y)
    expect(Math.max(...xs)).toBeCloseTo(0.05)
    expect(Math.min(...xs)).toBeCloseTo(-0.05)
    expect(Math.min(...ys)).toBeCloseTo(0)
    expect(Math.max(...ys)).toBeCloseTo(0.16)
    // Anticlockwise: a positive area.
    let area = 0
    shape.forEach(([x, y], k) => {
      const [nx, ny] = shape[(k + 1) % shape.length]
      area += x * ny - nx * y
    })
    expect(area / 2).toBeGreaterThan(0)
    // Symmetric about its axis.
    for (const [x, y] of shape) expect(shape.some(([u, v]) => Math.abs(u + x) < 1e-9 && Math.abs(v - y) < 1e-9)).toBe(true)
  })

  it('is nothing for a size that is not a usable number', () => {
    for (const [r, h] of [[0, 0.1], [0.1, 0], [NaN, 0.1], [0.1, -1], [Infinity, 0.1], [0.1, Infinity]] as Point2[]) {
      expect(flameProfile(r, h)).toEqual([])
      expect(flameOutline(r * 2, h)).toEqual([])
    }
  })

  it('breathes slowly and gently, never a flicker or a flash (WCAG 2.3.1): its glow and size within stated limits, changing no faster than a stated rate', () => {
    // Its size breathes at most 6% either way, its glow at most 8%.
    expect(FLAME.size).toBeLessThanOrEqual(0.06)
    expect(FLAME.glow).toBeLessThanOrEqual(0.08)
    // One breath every period, never quicker than one every two seconds.
    expect(FLAME.period).toBeGreaterThanOrEqual(2)
    const span = FLAME.period * 5
    for (let t = 0; t < span; t += 0.01) {
      const b = flameBreath(t)
      expect(b.height).toBeGreaterThanOrEqual(1 - FLAME.size - 1e-9)
      expect(b.height).toBeLessThanOrEqual(1 + FLAME.size + 1e-9)
      expect(b.width).toBeGreaterThanOrEqual(1 - FLAME.size - 1e-9)
      expect(b.width).toBeLessThanOrEqual(1 + FLAME.size + 1e-9)
      expect(b.glow).toBeGreaterThanOrEqual(1 - FLAME.glow - 1e-9)
      expect(b.glow).toBeLessThanOrEqual(1 + FLAME.glow + 1e-9)
    }
    // Stated rates: its brightness changes by at most a fifth of itself a second, its size by at most a seventh.
    expect(steepest((t) => flameBreath(t).glow, span)).toBeLessThanOrEqual(0.2)
    expect(steepest((t) => flameBreath(t).height, span)).toBeLessThanOrEqual(1 / 7)
    // What a pixel of it sees: at most one pulse of brightness in two seconds, a sixth of WCAG's three a second.
    // A pulse here is any rise and fall of 5% or more, half WCAG's 10%, so even a slight breath is counted.
    const glowPulses = pulses((t) => flameBreath(t).glow, span, 0.05)
    expect(glowPulses).toBeGreaterThan(0)
    expect(glowPulses / span).toBeLessThanOrEqual(0.5)
    // Its glow never swings by WCAG's 10% of full brightness in under a second.
    for (let t = 0; t < span; t += 0.05) expect(Math.abs(flameBreath(t + 1).glow - flameBreath(t).glow)).toBeLessThan(0.2)
  })

  it('is bounded through the bloom at night: the shader holds its breath to 1 ± FLAME.glow', () => {
    // The flame's shader clamps the breath uniform to the limits flameBreath keeps to, so a flame
    // is never brighter than a lit lamp of its colour by more than its breath, whatever the uniform holds.
    const material = flameMaterial('#ffffff')
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: '',
      fragmentShader: '#include <common>\n#include <color_fragment>',
    }
    material.onBeforeCompile(shader as never, undefined as never)
    const limits = `clamp(uBreath, ${(1 - FLAME.glow).toFixed(4)}, ${(1 + FLAME.glow).toFixed(4)})`
    expect(FLAME_BREATH_GLSL).toBe(limits)
    expect(shader.fragmentShader).toContain(`diffuseColor.rgb *= uGlow * ${limits};`)
    expect(shader.fragmentShader).not.toMatch(/uBreath[^,]*,\s*0\.0,\s*2\.0/)
    for (let t = 0; t < FLAME.period; t += 0.01) {
      const g = flameBreath(t).glow
      expect(g).toBeGreaterThanOrEqual(1 - FLAME.glow - 1e-9)
      expect(g).toBeLessThanOrEqual(1 + FLAME.glow + 1e-9)
    }
    expect(GLASS.nightGlow * (1 + FLAME.glow)).toBeLessThanOrEqual(2.2)
  })

  it('runs from the clock wrapped to its period, holds still when the clock does, and is finite for any clock', () => {
    expect(flameBreath(1.3)).toEqual(flameBreath(1.3))
    expect(flameBreath(0.4).glow).toBeCloseTo(flameBreath(0.4 + FLAME.period * 1000).glow, 6)
    expect(flameBreath(0).height).not.toBeCloseTo(flameBreath(FLAME.period / 4).height, 3)
    for (const t of [NaN, Infinity, -Infinity, -5, 1e12]) {
      const b = flameBreath(t)
      expect([b.width, b.height, b.glow].every(Number.isFinite)).toBe(true)
    }
  })
})

describe('a coin’s drop', () => {
  it('rests whole at the top when the clock stands still at its start (reduced motion), then falls, vanishes and reappears, so its loop never pops', () => {
    // A clock that never moves (reduced motion) is at 0: the coin shows whole, at the top, about to drop.
    expect(dropPose(0)).toEqual({ down: 0, scale: 1 })
    // The loop's wrap joins up: whole at the top at its end as at its start.
    expect(dropPose(DROP.period - 1e-9).scale).toBeCloseTo(1, 6)
    expect(dropPose(DROP.period - 1e-9).down).toBe(0)
    // It reaches the foot of its fall, and stays there till it has gone.
    expect(dropPose(DROP.period * DROP.fall[1]).down).toBe(1)
    expect(dropPose(DROP.period * DROP.vanish[1]).down).toBe(1)
    expect(dropPose(DROP.period * DROP.vanish[1]).scale).toBe(0)
    // It only shrinks once it is down (inside the bank), and only grows once back at the top.
    for (let t = 0; t < DROP.period; t += 0.01) {
      const p = dropPose(t)
      if (p.scale < 1) expect([0, 1]).toContain(p.down)
      if (p.down > 0 && p.down < 1) expect(p.scale).toBe(1)
    }
  })

  it('moves slowly and smoothly: no jump anywhere in its loop, its fall taking at least two seconds', () => {
    expect((DROP.fall[1] - DROP.fall[0]) * DROP.period).toBeGreaterThanOrEqual(2)
    const dt = 0.001
    for (let t = 0; t < DROP.period * 3; t += dt) {
      const [a, b] = [dropPose(t), dropPose(t + dt)]
      // It goes back to the top only while hidden, so that jump is never seen.
      if (a.scale > 0 || b.scale > 0) expect(Math.abs(b.down - a.down)).toBeLessThan(0.01)
      else expect([a.scale, b.scale]).toEqual([0, 0])
      expect(Math.abs(b.scale - a.scale)).toBeLessThan(0.01)
    }
  })

  it('holds still when the clock does, and is finite and within its range for any clock', () => {
    expect(dropPose(1.7)).toEqual(dropPose(1.7))
    for (const t of [NaN, Infinity, -3, 1e12, 0.5]) {
      const p = dropPose(t)
      expect(p.down).toBeGreaterThanOrEqual(0)
      expect(p.down).toBeLessThanOrEqual(1)
      expect(p.scale).toBeGreaterThanOrEqual(0)
      expect(p.scale).toBeLessThanOrEqual(1)
    }
  })
})

describe('a flower’s outline', () => {
  /** How many times the outline's distance from its middle rises to a crest and falls again: its petals. */
  const crests = (shape: Point2[]) => {
    const r = shape.map(([x, y]) => Math.hypot(x, y))
    return r.filter((v, k) => v > r[(k + r.length - 1) % r.length] && v >= r[(k + 1) % r.length]).length
  }

  it('is `petals` rounded petals round its middle, reaching `outer`, parted at `inner`, the first straight up, anticlockwise', () => {
    for (const petals of [6, 7, 8]) {
      const shape = flowerOutline(petals, 0.07, 0.03)
      expect(crests(shape)).toBe(petals)
      const r = shape.map(([x, y]) => Math.hypot(x, y))
      expect(Math.max(...r)).toBeCloseTo(0.07, 6)
      expect(Math.min(...r)).toBeGreaterThanOrEqual(0.03 - 1e-9)
      expect(Math.min(...r)).toBeLessThan(0.034)
      // The first petal's tip straight up.
      expect(shape[0][0]).toBeCloseTo(0, 9)
      expect(shape[0][1]).toBeCloseTo(0.07, 9)
      let area = 0
      shape.forEach(([x, y], k) => {
        const [nx, ny] = shape[(k + 1) % shape.length]
        area += x * ny - nx * y
      })
      expect(area / 2).toBeGreaterThan(0)
    }
  })

  it('is round at each petal’s tip, not a point: the tip’s neighbours stand nearly as far out', () => {
    const shape = flowerOutline(6, 0.07, 0.03)
    const r = shape.map(([x, y]) => Math.hypot(x, y))
    expect(r[1]).toBeGreaterThan(0.07 * 0.95)
    expect(r[r.length - 1]).toBeGreaterThan(0.07 * 0.95)
  })

  it('is nothing for sizes that are not usable, and keeps a whole number of petals from 3 to 12', () => {
    for (const [outer, inner] of [[0, 0], [NaN, 0.02], [Infinity, 0.02], [-1, 0.02]] as Point2[]) expect(flowerOutline(6, outer, inner)).toEqual([])
    expect(crests(flowerOutline(2, 0.07, 0.03))).toBe(3)
    expect(crests(flowerOutline(40, 0.07, 0.03))).toBe(12)
    expect(crests(flowerOutline(6.6, 0.07, 0.03))).toBe(7)
    expect(crests(flowerOutline(NaN, 0.07, 0.03))).toBe(6)
    // An inner radius past the outer, or not a number, is held inside it.
    for (const inner of [0.2, NaN, -1]) expect(flowerOutline(6, 0.07, inner).every(([x, y]) => Number.isFinite(x) && Math.hypot(x, y) <= 0.07 + 1e-9)).toBe(true)
  })
})
