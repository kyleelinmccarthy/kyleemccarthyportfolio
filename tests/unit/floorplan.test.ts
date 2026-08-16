import { describe, it, expect } from 'vitest'
import { layout, type Dir } from '@/components/journey/CinematicJourney'

/**
 * The real floor plan, kept in step with components/sections/Journey.tsx.
 * This test previously built its own array and drifted: it still described a
 * `up` move into the window room long after that became a walk-through-the-door
 * zoom, so it passed while describing a site that no longer existed.
 */
const FLOOR_PLAN: Array<{ id: string; dir: Dir }> = [
  { id: 'steps', dir: 'start' },
  { id: 'window', dir: 'in' },
  { id: 'floor', dir: 'right' },
  { id: 'desk', dir: 'right' },
  { id: 'way-out', dir: 'in' },
]

describe('the floor plan', () => {
  it('steps through the front door, then walks along the gallery wall', () => {
    const cells = layout(FLOOR_PLAN.map((s) => ({ ...s, node: null })))
    expect(cells.map((c) => [c.x, c.y])).toEqual([
      [0, 0], // the steps, outside
      [0, 0], // through the door — a zoom, so the same cell
      [1, 0], // right, onto the gallery floor
      [2, 0], // right, along to the desk
      [2, 0], // in again, to the way out
    ])
  })

  it('marks both thresholds as zooms and nothing else', () => {
    const cells = layout(FLOOR_PLAN.map((s) => ({ ...s, node: null })))
    // The front door and the way out are the two moments you step through
    // something rather than move past it.
    expect(cells.map((c) => c.zoom)).toEqual([false, true, false, false, true])
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
        expect(cells[i]!.zoom, `${FLOOR_PLAN[i]!.id} shares a cell but does not zoom`).toBe(true)
      }
      seen.set(key, i)
    })
  })
})
