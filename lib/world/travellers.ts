import type { Vector3 } from 'three'
import type { District, Place } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { dirOf } from './geo'
import { placeGoal } from './rig'
import type { Route } from './scatter'
import { groundOf } from './terrain'

/** A traveller covers `speed` of its route a second, and each starts `stagger` of the way behind the one before. */
export const TRAVEL = { speed: 0.07, stagger: 0.31 } as const

/**
 * How far along its route the `index`th traveller is at time `t` (0 to 1).
 * Under reduced motion (`still`) the clock stands still, and a traveller rests
 * at `rest` (`restFraction`: high on its arc, in no place's view of its
 * landmark); wherever a stopped clock happened to leave it, one stood over
 * Home's chimney.
 */
export function travellerFraction(t: number, index: number, still: boolean, rest: number): number {
  if (still) return rest
  const f = ((Number.isFinite(t) ? t : 0) * TRAVEL.speed + index * TRAVEL.stagger) % 1
  return f < 0 ? f + 1 : f
}

/**
 * True when nothing at `point` stands in the way of any place's landmark seen
 * from that place's camera: ahead of the camera and within twice the
 * landmark's angular size of the line of sight to its middle (in front of
 * it, or just behind it and showing over it).
 */
export function clearOfViews(point: Vector3, places: Place[], districts: District[]): boolean {
  return places.every((place) => {
    const eye = placeGoal(place, districts).position
    const ground = groundOf(place.at, districts)
    const top = ground.clone().addScaledVector(dirOf(place.at), place.height * MODEL_SCALE)
    const middle = ground.clone().add(top).multiplyScalar(0.5)
    const toMiddle = middle.clone().sub(eye)
    const half = Math.max(toMiddle.angleTo(top.clone().sub(eye)), toMiddle.angleTo(ground.clone().sub(eye)))
    const toPoint = point.clone().sub(eye)
    return !(toPoint.dot(toMiddle) > 0 && toPoint.angleTo(toMiddle) < half * 2)
  })
}

/**
 * Where a traveller rests on `arc` under reduced motion: the point nearest
 * the top of its arc (`arcApex`) that stands in no place's view of its
 * landmark (`clearOfViews`), to the nearest of `samples` steps; the top
 * itself if none is clear.
 */
export function restFraction(arc: Pick<Route, 'at'>, places: Place[], districts: District[], samples = 64): number {
  const apex = arcApex(arc, samples)
  const steps = Array.from({ length: samples + 1 }, (_, k) => k / samples).sort((a, b) => Math.abs(a - apex) - Math.abs(b - apex))
  return steps.find((f) => clearOfViews(arc.at(f), places, districts)) ?? apex
}

/** Where along `arc` (0 to 1) it stands highest above the planet, to the nearest of `samples` steps. */
export function arcApex(arc: Pick<Route, 'at'>, samples = 64): number {
  let best = 0
  let height = -Infinity
  for (let k = 0; k <= samples; k++) {
    const h = arc.at(k / samples).length()
    if (h > height) {
      height = h
      best = k / samples
    }
  }
  return best
}
