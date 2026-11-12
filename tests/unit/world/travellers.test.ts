import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { districts, places } from '@/content/world'
import { MODEL_SCALE } from '@/lib/world/camera'
import { placeGoal } from '@/lib/world/rig'
import { routes } from '@/lib/world/scatter'
import { groundOf } from '@/lib/world/terrain'
import { dirOf } from '@/lib/world/geo'
import { TRAVEL, arcApex, restFraction, travellerFraction } from '@/lib/world/travellers'
import { VIEW_FADE, placeView, viewClearance, viewFade } from '@/lib/world/starfield'

describe('the route travellers', () => {
  const arcs = routes(districts)

  it('move along their routes on the shared clock, each a share of the way behind the one before', () => {
    expect(travellerFraction(0, 0, false, 0.5)).toBeCloseTo(0)
    expect(travellerFraction(0, 1, false, 0.5)).toBeCloseTo(TRAVEL.stagger)
    expect(travellerFraction(10, 0, false, 0.5)).toBeCloseTo((10 * TRAVEL.speed) % 1)
    for (const t of [0, 3.3, 1e5]) for (let i = 0; i < 6; i++) {
      const f = travellerFraction(t, i, false, 0.5)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
    }
  })

  it('rest at the top of their arc under reduced motion, whatever the clock says', () => {
    for (const t of [0, 7, 1e5]) for (let i = 0; i < 6; i++) expect(travellerFraction(t, i, true, 0.4)).toBe(0.4)
  })

  it('finds the top of each arc: the point furthest from the planet', () => {
    for (const arc of arcs) {
      const apex = arcApex(arc)
      const top = arc.at(apex).length()
      for (let k = 0; k <= 100; k++) expect(arc.at(k / 100).length()).toBeLessThanOrEqual(top + 1e-9)
    }
  })

  /**
   * The places where a traveller at `point` stands in the way of the landmark, seen from the place's camera:
   * ahead of the camera and within twice the landmark's own angular size of the line of sight to its middle
   * (in front of it, or just behind and showing over it: either crowds the view).
   */
  function standsBefore(point: Vector3): string[] {
    return places
      .filter((place) => {
        const eye = placeGoal(place, districts).position
        const ground = groundOf(place.at, districts)
        const top = ground.clone().addScaledVector(dirOf(place.at), place.height * MODEL_SCALE)
        const middle = ground.clone().add(top).multiplyScalar(0.5)
        const toMiddle = middle.clone().sub(eye)
        const half = Math.max(toMiddle.angleTo(top.clone().sub(eye)), toMiddle.angleTo(ground.clone().sub(eye)))
        const toPoint = point.clone().sub(eye)
        return toPoint.dot(toMiddle) > 0 && toPoint.angleTo(toMiddle) < half * 2
      })
      .map((p) => p.id)
  }

  it('at rest, never stand in the way of a landmark seen from its place (item 12)', () => {
    for (const arc of arcs) expect(standsBefore(arc.at(restFraction(arc, places, districts))), `the ${arc.from}–${arc.to} traveller`).toEqual([])
  })

  it('rest as near the top of their arc as that allows', () => {
    for (const arc of arcs) {
      const rest = restFraction(arc, places, districts)
      const apex = arcApex(arc)
      // Every point nearer the top than the rest stands in some place's way.
      for (let k = 0; k <= 64; k++) {
        const f = k / 64
        if (Math.abs(f - apex) < Math.abs(rest - apex) - 1e-9) expect(standsBefore(arc.at(f)).length, `${arc.from}–${arc.to} at ${f}`).toBeGreaterThan(0)
      }
    }
  })

  it('fade their routes’ dashes out where they would cross a place’s view of its landmark or crowd its camera (item 10)', () => {
    for (const place of places) {
      const view = placeView(place, districts, places)
      for (const arc of arcs) {
        for (let k = 0; k <= 200; k++) {
          const p = arc.at(k / 200)
          const alpha = viewFade(p, view)
          expect(alpha).toBeGreaterThanOrEqual(0)
          expect(alpha).toBeLessThanOrEqual(1)
          // Anything in the view, or in the berth round the camera, is gone; anything well clear is as it was.
          if (viewClearance(p, view) === 0) expect(alpha, `${place.id} ${arc.from}–${arc.to} at ${k}`).toBe(0)
          if (viewClearance(p, view) >= VIEW_FADE) expect(alpha).toBe(1)
        }
      }
    }
    // Away from a place, nothing fades.
    expect(viewFade(arcs[0].at(0.5), null)).toBe(1)
  })

  it('found the streaks over Home: dashes of a route ran through its view before', () => {
    const view = placeView(places.find((p) => p.id === 'home')!, districts, places)
    const through = arcs.some((arc) => Array.from({ length: 201 }, (_, k) => arc.at(k / 200)).some((p) => viewClearance(p, view) === 0))
    expect(through).toBe(true)
  })

  it('did, where a stopped clock used to leave them: one stood in the way of Home', () => {
    const before = arcs.flatMap((arc, i) => standsBefore(arc.at((i * TRAVEL.stagger) % 1)))
    expect(before).toContain('home')
  })
})
