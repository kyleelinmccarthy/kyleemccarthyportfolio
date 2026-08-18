import { describe, it, expect } from 'vitest'
import { layout, type Dir } from '@/components/journey/CinematicJourney'

/**
 * The real floor plan, kept in step with components/sections/Journey.tsx.
 * This test previously built its own array and drifted: it still described an
 * `up` move into the landing long after that became a walk-through-the-door
 * zoom, so it passed while describing a site that no longer existed.
 */
const FLOOR_PLAN: Array<{ id: string; dir: Dir }> = [
  { id: 'steps', dir: 'start' },
  { id: 'landing', dir: 'in' },
  { id: 'floor', dir: 'up' },
  { id: 'desk', dir: 'in' },
  { id: 'way-out', dir: 'out' },
]

describe('the floor plan', () => {
  it('goes in the front door, up the stairs, into the office and back out', () => {
    const cells = layout(FLOOR_PLAN.map((s) => ({ ...s, node: null })))
    expect(cells.map((c) => [c.x, c.y])).toEqual([
      [0, 0], // the steps, outside
      [0, 0], // through the front door — a zoom, so the same cell
      [0, -1], // up the stairs the landing draws, to the gallery
      [0, -1], // through the office door — a zoom again
      [0, -1], // and back out of it
    ])
  })

  it('marks every threshold as a zoom, and which way through it', () => {
    const cells = layout(FLOOR_PLAN.map((s) => ({ ...s, node: null })))
    // Three moments you step through something rather than move past it: the
    // front door, the office door, and backing out of the office. The climb to
    // the gallery is a move, not a threshold.
    expect(cells.map((c) => c.zoom)).toEqual([null, 'in', null, 'in', 'out'])
  })

  it('never revisits a cell except deliberately, via a zoom', () => {
    const cells = layout(FLOOR_PLAN.map((s) => ({ ...s, node: null })))
    const seen = new Map<string, number>()
    cells.forEach((c, i) => {
      const key = `${c.x},${c.y}`
      const first = seen.get(key)
      if (first !== undefined) {
        // Two rooms sharing a cell only works if the later one zooms over the
        // earlier one; otherwise they stack invisibly on top of each other.
        expect(
          cells[i]!.zoom,
          `${FLOOR_PLAN[i]!.id} shares a cell but does not zoom`
        ).not.toBeNull()
      }
      seen.set(key, i)
    })
  })
})
