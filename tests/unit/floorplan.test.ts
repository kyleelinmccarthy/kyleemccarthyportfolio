import { describe, it, expect } from 'vitest'
import { layout } from '@/components/journey/CinematicJourney'

describe('the floor plan', () => {
  it('walks up the steps, then along the gallery wall', () => {
    const cells = layout([
      { id: 'steps', dir: 'start', node: null },
      { id: 'window', dir: 'up', node: null },
      { id: 'floor', dir: 'right', node: null },
      { id: 'desk', dir: 'right', node: null },
      { id: 'way-out', dir: 'in', node: null },
    ])
    expect(cells.map((c) => [c.x, c.y])).toEqual([
      [0, 0],   // the steps, outside
      [0, -1],  // up, through the door
      [1, -1],  // right, onto the gallery floor
      [2, -1],  // right, along to the desk
      [2, -1],  // in, zooming to the way out
    ])
    expect(cells[4]!.zoom).toBe(true)
  })
})
