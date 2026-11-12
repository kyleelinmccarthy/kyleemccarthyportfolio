import { describe, it, expect } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import { districts, places } from '@/content/world'
import { MODEL_SCALE, focusPose } from '@/lib/world/camera'
import { dirOf, surfaceFrame } from '@/lib/world/geo'
import { footprintRadius } from '@/lib/world/kit'
import { groundOf } from '@/lib/world/terrain'
import { CLOUD_CLEAR, CLOUD_SEEDS, cloudAt, easeShare, lowClouds, placeView, puffMatrix, viewClearance } from '@/lib/world/starfield'

/*
 * Item 9: a low cloud never comes between a place's camera and its landmark,
 * nor fills the camera's foreground, while the visitor is at that place,
 * wherever the clouds have drifted to and wherever the camera has circled to.
 * The landmark is not a line up its place's axis: it fills its allowed
 * footprint, so the sight lines to the footprint's edge are kept clear too.
 */

/** Distance from `p` to the segment `a`–`b`. */
function toSegment(p: Vector3, a: Vector3, b: Vector3): number {
  const ab = b.clone().sub(a)
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()))
  return p.distanceTo(a.clone().addScaledVector(ab, t))
}

const clouds = lowClouds(CLOUD_SEEDS.low)
/** Steps round each cloud's circuit, and azimuths round each place, the check samples (finer than the rule needs). */
const STEPS = 360
const AZIMUTHS = 48
/** Points round the footprint's edge the check looks at, at each of three heights. */
const EDGE_POINTS = 8

/** What a visitor at `place` looks at: up the place's axis, and round the edge of its allowed footprint at its foot, middle and top. */
function lookedAt(place: (typeof places)[number]): Vector3[] {
  const ground = groundOf(place.at, districts)
  const up = dirOf(place.at)
  const { south, east } = surfaceFrame(up)
  const h = place.height * MODEL_SCALE
  const edge = footprintRadius(place.id, places) * MODEL_SCALE
  const axis = [0, 0.25, 0.5, 0.75, 1].map((k) => ground.clone().addScaledVector(up, h * k))
  const rim = [0, 0.5, 1].flatMap((k) =>
    Array.from({ length: EDGE_POINTS }, (_, i) => {
      const a = (i / EDGE_POINTS) * Math.PI * 2
      return ground.clone().addScaledVector(up, h * k).addScaledVector(south, edge * Math.cos(a)).addScaledVector(east, edge * Math.sin(a))
    }),
  )
  return [...axis, ...rim]
}

describe('low clouds at a place', () => {
  it('know how far a point is from what the visitor sees: inside the view, none; outside it, the gap past the footprint', () => {
    const place = places[0]
    const view = placeView(place, districts, places)
    const ground = groundOf(place.at, districts)
    const up = dirOf(place.at)
    const pad = footprintRadius(place.id, places) * MODEL_SCALE
    expect(view.pad).toBeCloseTo(pad, 6)
    const middle = ground.clone().addScaledVector(up, (place.height * MODEL_SCALE) / 2)
    expect(viewClearance(middle, view)).toBe(0)
    // At the footprint's edge, beside the landmark's middle: in the view.
    const { south } = surfaceFrame(up)
    expect(viewClearance(middle.clone().addScaledVector(south, -pad * 0.98), view)).toBe(0)
    // Straight under the ground, the footprint's radius and 0.05 more down: 0.05 from the view.
    expect(viewClearance(ground.clone().addScaledVector(up, -(pad + 0.05)), view)).toBeCloseTo(0.05, 3)
  })

  it.each(places.map((p) => [p.id, p] as const))('count every sight line from %s’s camera to its footprint’s edge as in the view', (_, place) => {
    const view = placeView(place, districts, places)
    const ground = groundOf(place.at, districts)
    const frame = surfaceFrame(dirOf(place.at))
    const out: string[] = []
    for (let k = 0; k < 16; k++) {
      const eye = focusPose(ground, frame, place.height, (k / 16) * Math.PI * 2).position
      for (const target of lookedAt(place)) {
        for (let s = 1; s <= 10; s++) {
          const p = eye.clone().lerp(target, s / 10)
          if (viewClearance(p, view) > 0 && out.length < 3) out.push(`azimuth ${k}, ${s / 10} of the way to ${target.toArray().map((x) => x.toFixed(3))}: ${viewClearance(p, view).toFixed(4)} clear`)
        }
      }
    }
    expect(out).toEqual([])
  })

  it.each(places.map((p) => [p.id, p] as const))('never cut the view of %s, to its footprint’s edge, or crowd its camera, over the whole drift', (_, place) => {
    const view = placeView(place, districts, places)
    const ground = groundOf(place.at, districts)
    const frame = surfaceFrame(dirOf(place.at))
    const targets = lookedAt(place)
    const eyes = Array.from({ length: AZIMUTHS }, (_, k) => focusPose(ground, frame, place.height, (k / AZIMUTHS) * Math.PI * 2).position)
    // Every eye and target lies within this of the place's ground: a puff further than this and its own radius cuts nothing.
    const reach = Math.max(...[...eyes, ...targets].map((p) => p.distanceTo(ground)))
    const m = new Matrix4()
    const faults: string[] = []
    for (const [c, cloud] of clouds.entries()) {
      for (let s = 0; s < STEPS && faults.length < 3; s++) {
        const t = ((s / STEPS) * Math.PI * 2) / cloud.speed
        const at = cloudAt(cloud, t, view)
        if (at.scale === 0) continue
        for (const puff of cloud.puffs) {
          puffMatrix(at.matrix, puff, m)
          const centre = new Vector3().setFromMatrixPosition(m)
          const r = m.getMaxScaleOnAxis()
          if (centre.distanceTo(ground) - r > reach) continue
          for (const eye of eyes) {
            if (centre.distanceTo(eye) - r < CLOUD_CLEAR.near) faults.push(`cloud ${c} crowds the camera at step ${s}`)
            for (const target of targets) if (toSegment(centre, eye, target) < r) faults.push(`cloud ${c} cuts the view at step ${s}`)
          }
        }
      }
    }
    expect(faults).toEqual([])
  })

  it('drift as they always have when the visitor is not at a place, and anywhere well clear of the place', () => {
    const view = placeView(places[0], districts, places)
    for (const cloud of clouds) {
      const free = cloudAt(cloud, 12.3, null)
      expect(free.scale).toBe(1)
      const turn = new Matrix4().makeRotationAxis(cloud.axis, 12.3 * cloud.speed).multiply(cloud.matrix)
      expect(free.matrix.equals(turn)).toBe(true)
      // At a place, a cloud on the far side of the planet is untouched.
      const far = cloudAt(cloud, 12.3, view)
      const centre = new Vector3().setFromMatrixPosition(turn)
      if (centre.angleTo(dirOf(places[0].at)) > Math.PI / 2) expect(far.scale).toBe(1)
    }
  })
})

describe('easing into and out of a place’s view', () => {
  it('moves a share of the way each frame by the time passed, at once under reduced motion', () => {
    // Under reduced motion, all the way at once, whatever the frame's length.
    for (const delta of [0, 0.016, 1, NaN]) expect(easeShare(delta, 4, true)).toBe(1)
    // Otherwise in proportion to the frame's length, never past the whole way, and nothing for no time or a bad one.
    expect(easeShare(0.016, 4, false)).toBeCloseTo(0.064)
    expect(easeShare(0.5, 4, false)).toBe(1)
    for (const delta of [0, -1, NaN, Infinity]) expect(easeShare(delta, 4, false), String(delta)).toBe(delta === Infinity ? 1 : 0)
    expect(easeShare(0.016, NaN, false)).toBe(0)
  })
})
