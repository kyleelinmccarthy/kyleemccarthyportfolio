import { describe, it, expect } from 'vitest'
import { extrudedGeometry } from '@/components/world/models/kit'
import { bowOutline, smileOutline, type Point2 } from '@/lib/world/kit'

/** Twice the signed area of an outline: positive when it runs anticlockwise. */
const signedArea = (shape: Point2[]) => shape.reduce((sum, [x, y], i) => {
  const [nx, ny] = shape[(i + 1) % shape.length]!
  return sum + x * ny - nx * y
}, 0)

const bounds = (shape: Point2[]) => ({
  left: Math.min(...shape.map(([x]) => x)),
  right: Math.max(...shape.map(([x]) => x)),
  bottom: Math.min(...shape.map(([, y]) => y)),
  top: Math.max(...shape.map(([, y]) => y)),
})

const values = [0.02, 0, -1, NaN, Infinity, 1e-9, 3]

describe('a bow’s outline', () => {
  it('is two loops round a knot, the size asked for, a closed shape with area, symmetric', () => {
    const shape = bowOutline(0.02, 0.012)
    expect(shape).toHaveLength(12)
    const b = bounds(shape)
    expect(b.right - b.left).toBeCloseTo(0.02)
    expect(b.top - b.bottom).toBeCloseTo(0.012)
    expect(Math.abs(signedArea(shape))).toBeGreaterThan(0)
    for (const [x, y] of shape) expect(shape.some(([ox, oy]) => Math.abs(ox + x) < 1e-12 && Math.abs(oy - y) < 1e-12)).toBe(true)
    // Pinched at the knot: narrower in the middle than at the loops.
    const knot = Math.max(...shape.filter(([x]) => Math.abs(x) < 0.003).map(([, y]) => Math.abs(y)))
    expect(knot).toBeLessThan(0.006 * 0.5)
  })

  it('is nothing for a size that is not usable, and finite always', () => {
    for (const w of values) {
      for (const h of values) {
        const shape = bowOutline(w, h)
        expect(shape.flat().every(Number.isFinite), `${w} ${h}`).toBe(true)
        if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) expect(shape, `${w} ${h}`).toEqual([])
        expect(() => extrudedGeometry(shape, 0.002, 0.0005, 0)).not.toThrow()
      }
    }
  })
})

describe('a smile’s outline', () => {
  it('is a thin crescent, its middle lowest and its ends turned up, its lowest point 0.35 of its width under its middle', () => {
    const shape = smileOutline(0.014, 0.0025)
    const b = bounds(shape)
    expect(b.right - b.left).toBeCloseTo(0.014 * 0.89, 3)
    expect(b.bottom).toBeCloseTo(-0.014 * 0.35)
    expect(Math.abs(signedArea(shape))).toBeGreaterThan(0)
    // Its ends stand higher than its middle.
    const lowest = Math.min(...shape.map(([, y]) => y))
    const ends = shape.filter(([x]) => Math.abs(x) > 0.006)
    expect(Math.min(...ends.map(([, y]) => y))).toBeGreaterThan(lowest + 0.001)
  })

  it('is the Doll’s smile, and her bows the kit’s bows: Playground draws them from the kit', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const source = readFileSync(resolve(__dirname, '../../../components/world/models/Playground.tsx'), 'utf8')
    expect(source).toContain('bowOutline(')
    expect(source).toContain('smileOutline(')
    expect(source).not.toMatch(/function (bow|smile)\(/)
  })

  it('is nothing for a size that is not usable, and finite always', () => {
    for (const w of values) {
      for (const t of values) {
        const shape = smileOutline(w, t)
        expect(shape.flat().every(Number.isFinite), `${w} ${t}`).toBe(true)
        expect(() => extrudedGeometry(shape, 0.002, 0.0005, 0)).not.toThrow()
      }
    }
    expect(smileOutline(0, 0.01)).toEqual([])
    expect(smileOutline(0.01, 0)).toEqual([])
    expect(smileOutline(NaN, 0.01)).toEqual([])
  })
})
