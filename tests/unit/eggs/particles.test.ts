import { describe, it, expect } from 'vitest'
import { CONFETTI, FIREWORKS } from '@/content/eggs'
import { mulberry32 } from '@/lib/world/rng'
import { confetti, fireworks, pieceAt, shellAt, showLength, thrown } from '@/lib/eggs/particles'

describe('something thrown', () => {
  it('starts where it was thrown from, slows in the air, and falls', () => {
    const from = { x: 100, y: 100 }
    expect(thrown(from, 300, -300, 0, { drag: 2, gravity: 900 })).toEqual(from)
    // Without gravity it coasts to a stop no further than speed / drag.
    const far = thrown(from, 300, 0, 50, { drag: 2, gravity: 0 })
    expect(far.x).toBeCloseTo(100 + 300 / 2)
    // With it, it ends up falling.
    expect(thrown(from, 0, -300, 3, { drag: 2, gravity: 900 }).y).toBeGreaterThan(from.y)
    expect(thrown(from, 0, 0, NaN, { drag: 2, gravity: 900 })).toEqual(from)
  })
})

describe('the confetti', () => {
  const pieces = confetti(mulberry32(1), CONFETTI)

  it('is as many pieces as tuned, in the palette’s colours, the same for the same seed', () => {
    expect(pieces).toHaveLength(CONFETTI.pieces)
    for (const p of pieces) expect(CONFETTI.colors).toContain(p.color)
    expect(confetti(mulberry32(1), CONFETTI)).toEqual(pieces)
  })

  it('bursts mostly upward, then fades out by the end of its time', () => {
    const up = pieces.filter((p) => p.vy < 0).length
    expect(up / pieces.length).toBeGreaterThan(0.8)
    const from = { x: 200, y: 200 }
    for (const p of pieces) {
      expect(pieceAt(p, from, 0, CONFETTI).alpha).toBe(1)
      expect(pieceAt(p, from, CONFETTI.seconds, CONFETTI).alpha).toBe(0)
    }
  })
})

describe('the fireworks', () => {
  const view = { width: 1366, height: 768 }
  const shells = fireworks(mulberry32(2), view, FIREWORKS)

  it('send up the tuned shells one after another, bursting over the upper middle of the screen', () => {
    expect(shells).toHaveLength(FIREWORKS.shells)
    for (let i = 1; i < shells.length; i++) expect(shells[i].start).toBeGreaterThan(shells[i - 1].start)
    for (const s of shells) {
      expect(s.at.x).toBeGreaterThanOrEqual(view.width * FIREWORKS.band.x[0])
      expect(s.at.x).toBeLessThanOrEqual(view.width * FIREWORKS.band.x[1])
      expect(s.at.y).toBeGreaterThanOrEqual(view.height * FIREWORKS.band.y[0])
      expect(s.at.y).toBeLessThanOrEqual(view.height * FIREWORKS.band.y[1])
      expect(s.from.y).toBeGreaterThan(view.height)
      expect(s.sparks).toHaveLength(FIREWORKS.sparks)
    }
  })

  it('wait, rise, burst and are over, all of them by the end of the show', () => {
    const s = shells[1]
    expect(shellAt(s, s.start - 0.1, FIREWORKS).phase).toBe('waiting')
    expect(shellAt(s, s.start + FIREWORKS.rise / 2, FIREWORKS).phase).toBe('rising')
    const burst = shellAt(s, s.start + FIREWORKS.rise + 0.01, FIREWORKS)
    expect(burst.phase).toBe('burst')
    for (const shell of shells) expect(shellAt(shell, showLength(FIREWORKS) + 1e-6, FIREWORKS).phase).toBe('over')
  })
})
