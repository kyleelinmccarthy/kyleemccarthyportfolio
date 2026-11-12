import { describe, it, expect } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import {
  CAMERA_FOV,
  FARTHEST,
  FOCUS,
  MODEL_SCALE,
  ZOOM_OUT_ROOM,
  easeInOutCubic,
  flightAt,
  flightSeconds,
  focusEye,
  focusPose,
  maxDistance,
  orbitPose,
  overviewDistance,
  type Pose,
} from '@/lib/world/camera'
import { CLOUD_SEEDS, farClouds, puffMatrix } from '@/lib/world/starfield'
import { dirOf, surfaceFrame } from '@/lib/world/geo'
import { places } from '@/content/world'
import { FOOTPRINT } from '@/lib/world/kit'

/** The way a pose looks: a camera's forward is its local -Z. */
const forward = (p: Pose) => new Vector3(0, 0, -1).applyQuaternion(p.quaternion)

const isFiniteVec = (v: Vector3) => [v.x, v.y, v.z].every(Number.isFinite)
const isFiniteQuat = (q: Quaternion) => [q.x, q.y, q.z, q.w].every(Number.isFinite)

describe('overview', () => {
  it('orbits looking at the centre', () => {
    const d = dirOf({ lat: 10, lon: 20 }), p = orbitPose(d, 4.5)
    expect(p.position.length()).toBeCloseTo(4.5)
    expect(forward(p).dot(d.clone().negate())).toBeCloseTo(1)
    expect(p.up.distanceTo(new Vector3(0, 1, 0))).toBeCloseTo(0)
  })

  it('never sits exactly over a pole', () => {
    for (const dir of [new Vector3(0, 1, 0), new Vector3(0, -1, 0), new Vector3(0.01, 1, 0), dirOf({ lat: 85, lon: 40 })]) {
      const p = orbitPose(dir, 4.5), label = dir.toArray().join(',')
      expect(p.position.length(), label).toBeCloseTo(4.5)
      expect(Math.hypot(p.position.x, p.position.z), label).toBeGreaterThan(0.01)
      expect(isFiniteQuat(p.quaternion), label).toBe(true)
      // Still looking at the centre.
      expect(forward(p).dot(p.position.clone().normalize().negate()), label).toBeCloseTo(1)
    }
  })

  it('treats the direction as a direction, whatever its length', () => {
    const d = dirOf({ lat: 30, lon: -60 })
    expect(orbitPose(d.clone().multiplyScalar(4.5), 3).position.distanceTo(orbitPose(d, 3).position)).toBeCloseTo(0)
  })

  it('keeps the planet in frame on a narrow screen', () => {
    expect(overviewDistance(1.78)).toBeCloseTo(4.5)
    expect(overviewDistance(0.5)).toBeCloseTo(8.2)
  })
})

describe('the furthest the camera goes', () => {
  /** The nearest any far cloud's puff comes to the centre. */
  const nearestCloud = Math.min(
    ...(['high', 'low'] as const).flatMap((q) =>
      farClouds(CLOUD_SEEDS.far, q).flatMap((c) =>
        c.puffs.map((p) => {
          const m = puffMatrix(c.matrix, p)
          return new Vector3().setFromMatrixPosition(m).length() - m.getMaxScaleOnAxis()
        }),
      ),
    ),
  )
  /** Half the planet's width as seen, its glow included, fits across the screen's narrower half-angle. */
  const planetFits = (aspect: number, distance: number) => {
    const half = Math.atan(Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * Math.min(1, aspect))
    return Math.asin(1.1 / distance) <= half
  }

  it.each([0.3, 0.37, 0.46, 1.6])('stays inside the far clouds and keeps the planet in frame at an aspect of %s', (aspect) => {
    expect(maxDistance(aspect)).toBeLessThan(nearestCloud)
    expect(maxDistance(aspect)).toBeLessThanOrEqual(FARTHEST)
    expect(overviewDistance(aspect)).toBeLessThanOrEqual(maxDistance(aspect))
    expect(planetFits(aspect, overviewDistance(aspect))).toBe(true)
  })

  it('leaves room to zoom out where the window allows it, and caps it in very narrow ones', () => {
    expect(maxDistance(1.6)).toBeCloseTo(overviewDistance(1.6) + ZOOM_OUT_ROOM)
    expect(maxDistance(0.46)).toBeCloseTo(overviewDistance(0.46) + ZOOM_OUT_ROOM)
    // Below about 0.39 the room shrinks to the cap, and below about 0.32 the overview itself is held at it.
    expect(maxDistance(0.37)).toBe(FARTHEST)
    expect(maxDistance(0.3)).toBe(FARTHEST)
    expect(overviewDistance(0.3)).toBe(FARTHEST)
    expect(overviewDistance(0.37)).toBeLessThan(FARTHEST)
    // Never shrinks as the window narrows.
    for (let a = 0.2; a < 2; a += 0.01) expect(maxDistance(a)).toBeGreaterThanOrEqual(maxDistance(a + 0.01) - 1e-9)
  })

  it('copes with a window of no width or no height', () => {
    for (const a of [0, NaN, Infinity, -1]) {
      expect(Number.isFinite(maxDistance(a))).toBe(true)
      expect(Number.isFinite(overviewDistance(a))).toBe(true)
    }
  })
})

describe('focus', () => {
  it('uses the model scale from the brief', () => {
    expect(MODEL_SCALE).toBe(0.088)
  })

  it('frames a place from the south, above the ground, looking at it', () => {
    for (const pl of places) {
      const d = dirOf(pl.at), f = surfaceFrame(d), ground = d.clone().multiplyScalar(1.02), p = focusPose(ground, f, pl.height, 0)
      expect(p.position.length(), pl.id).toBeGreaterThan(1.2)
      expect(p.position.clone().sub(ground).dot(f.south), pl.id).toBeGreaterThan(0)
      expect(forward(p).dot(ground.clone().sub(p.position).normalize()), pl.id).toBeGreaterThan(0.9)
      expect(p.up.distanceTo(f.up), pl.id).toBeCloseTo(0)
    }
  })

  it('sits back and up from the place by a little plus a share of its height', () => {
    const d = dirOf({ lat: 0, lon: 0 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02), h = 2 * MODEL_SCALE
    const expected = g.clone().addScaledVector(f.up, FOCUS.up + FOCUS.upPerHeight * h).addScaledVector(f.south, FOCUS.back + FOCUS.backPerHeight * h)
    expect(focusPose(g, f, 2, 0).position.distanceTo(expected)).toBeCloseTo(0)
  })

  it('tells a landmark where its place camera stands, in the landmark’s own units', () => {
    const d = dirOf({ lat: 10, lon: 40 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02)
    for (const height of [1.0, 1.5, 2.4]) {
      const seen = focusPose(g, f, height, 0).position.sub(g)
      const eye = focusEye(height)
      expect(seen.dot(f.up) / MODEL_SCALE).toBeCloseTo(eye.up, 6)
      expect(seen.dot(f.south) / MODEL_SCALE).toBeCloseTo(eye.back, 6)
    }
  })

  /** How tall a landmark `height` model units tall looks from its place camera, as an angle. */
  function apparentSize(height: number): number {
    const d = dirOf({ lat: 0, lon: 0 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02)
    const p = focusPose(g, f, height, 0).position
    const foot = g.clone()
    const top = g.clone().addScaledVector(f.up, height * MODEL_SCALE)
    return foot.sub(p).angleTo(top.sub(p))
  }

  it('frames short landmarks nearly as large as tall ones, so the fixed part of its distance never dominates', () => {
    // A 1.0 landmark (the shortest a place has) against a 2.5 one (about the tallest).
    expect(apparentSize(1.0) / apparentSize(2.5)).toBeGreaterThanOrEqual(FOCUS.minSizeRatio)
    // And never smaller for a taller one.
    for (let h = 1.0; h < 2.5; h += 0.1) expect(apparentSize(h + 0.1)).toBeGreaterThan(apparentSize(h))
  })

  it('stays above the ground, looking down, and outside the landmark’s footprint, at every height a place can have', () => {
    const d = dirOf({ lat: 0, lon: 0 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02)
    for (let h = 1.0; h <= 2.6; h += 0.1) {
      const p = focusPose(g, f, h, 0)
      const off = p.position.clone().sub(g)
      // Higher than the landmark's top, so it looks down on it and the horizon stays behind it.
      expect(off.dot(f.up), `${h}`).toBeGreaterThan(h * MODEL_SCALE)
      expect(forward(p).dot(f.up), `${h}`).toBeLessThan(0)
      // Further across the ground than any landmark reaches.
      const across = off.clone().addScaledVector(f.up, -off.dot(f.up)).length()
      expect(across, `${h}`).toBeGreaterThan(FOOTPRINT.radius * MODEL_SCALE * 2)
    }
  })

  it('circles the place as azimuth changes', () => {
    const d = dirOf({ lat: 0, lon: 0 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02)
    expect(focusPose(g, f, 2, Math.PI).position.clone().sub(g).dot(f.south)).toBeLessThan(0)
    // A quarter turn leaves the camera off to one side, the same distance from the place.
    const side = focusPose(g, f, 2, Math.PI / 2).position.clone().sub(g)
    expect(Math.abs(side.dot(f.south))).toBeCloseTo(0)
    expect(Math.abs(side.dot(f.east))).toBeGreaterThan(0.5)
    expect(side.length()).toBeCloseTo(focusPose(g, f, 2, 0).position.distanceTo(g))
  })
})

describe('flight', () => {
  it('eases in and out', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625)
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375)
  })

  it('flies from one pose to the other without passing through the planet', () => {
    for (const a of places) for (const b of places) {
      const from = focusPose(dirOf(a.at).multiplyScalar(1.02), surfaceFrame(dirOf(a.at)), a.height, 0)
      const to = focusPose(dirOf(b.at).multiplyScalar(1.02), surfaceFrame(dirOf(b.at)), b.height, 0)
      expect(flightAt(from, to, 0).position.distanceTo(from.position)).toBeCloseTo(0)
      expect(flightAt(from, to, 1).position.distanceTo(to.position)).toBeCloseTo(0)
      for (let k = 0; k <= 1; k += 0.05) expect(flightAt(from, to, k).position.length(), `${a.id}>${b.id}@${k}`).toBeGreaterThanOrEqual(1.2)
    }
  })

  it('lands exactly on the endpoints, and clamps k outside [0, 1]', () => {
    const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5), b = orbitPose(dirOf({ lat: 20, lon: 100 }), 3)
    for (const [k, end] of [[0, a], [-1, a], [1, b], [2, b]] as Array<[number, Pose]>) {
      const at = flightAt(a, b, k)
      expect(at.position.equals(end.position), `k=${k}`).toBe(true)
      expect(at.quaternion.equals(end.quaternion), `k=${k}`).toBe(true)
      // Copies, so moving the camera never edits the pose it came from.
      expect(at.position).not.toBe(end.position)
      expect(at.quaternion).not.toBe(end.quaternion)
    }
  })

  it('lifts off the ground on the way between two places', () => {
    const a = places[0]!, b = places.at(-1)!
    const from = focusPose(dirOf(a.at).multiplyScalar(1.02), surfaceFrame(dirOf(a.at)), a.height, 0)
    const to = focusPose(dirOf(b.at).multiplyScalar(1.02), surfaceFrame(dirOf(b.at)), b.height, 0)
    const mid = flightAt(from, to, 0.5).position.length()
    expect(mid).toBeGreaterThan(Math.max(from.position.length(), to.position.length()))
  })

  it('moves the camera along the arc and turns it as it goes', () => {
    const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5), b = orbitPose(dirOf({ lat: 0, lon: 90 }), 4.5)
    const mid = flightAt(a, b, 0.5)
    const halfway = dirOf({ lat: 0, lon: 45 })
    expect(mid.position.clone().normalize().dot(halfway)).toBeCloseTo(1)
    expect(new Vector3(0, 0, -1).applyQuaternion(mid.quaternion).dot(halfway.negate())).toBeCloseTo(1)
  })

  it('stays finite when both poses share a direction', () => {
    const d = dirOf({ lat: 12, lon: 34 }), a = orbitPose(d, 4.5), b = orbitPose(d, 2.75)
    for (let k = 0; k <= 1; k += 0.1) {
      const at = flightAt(a, b, k)
      expect(isFiniteVec(at.position) && isFiniteQuat(at.quaternion), `k=${k}`).toBe(true)
      expect(at.position.clone().normalize().dot(d), `k=${k}`).toBeCloseTo(1)
    }
  })

  it('stays finite, and clear of the planet, when the poses are exactly opposite', () => {
    const d = dirOf({ lat: 0, lon: 30 })
    const a = orbitPose(d, 4.5), b = orbitPose(d.clone().negate(), 4.5)
    expect(a.position.clone().normalize().dot(b.position.clone().normalize())).toBeCloseTo(-1)
    for (let k = 0; k <= 1; k += 0.05) {
      const at = flightAt(a, b, k)
      expect(isFiniteVec(at.position) && isFiniteQuat(at.quaternion), `k=${k}`).toBe(true)
      expect(at.position.length(), `k=${k}`).toBeGreaterThanOrEqual(4.5 - 1e-9)
    }
  })

  it('can be restarted from any point mid-flight', () => {   // Review Focus 3
    const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5), b = orbitPose(dirOf({ lat: 0, lon: 170 }), 4.5)
    const mid = flightAt(a, b, 0.4), restart: Pose = { ...mid, up: new Vector3(0, 1, 0) }
    expect(flightAt(restart, a, 1).position.distanceTo(a.position)).toBeCloseTo(0)
    expect(flightAt(restart, a, 0).position.distanceTo(mid.position)).toBeCloseTo(0)
    expect(flightAt(restart, a, 0.5).position.length()).toBeGreaterThanOrEqual(1.2)
  })

  it('does not animate under reduced motion', () => {
    const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5)
    expect(flightSeconds(a, a, true)).toBe(0)
    expect(flightSeconds(a, orbitPose(dirOf({ lat: 0, lon: 90 }), 4.5), false)).toBeGreaterThan(1)
    expect(flightSeconds(a, orbitPose(dirOf({ lat: 0, lon: 90 }), 4.5), true)).toBe(0)
  })

  it('takes longer the further it goes, up to a cap', () => {
    const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5)
    expect(flightSeconds(a, a, false)).toBeCloseTo(1.1)
    expect(flightSeconds(a, orbitPose(dirOf({ lat: 0, lon: 90 }), 4.5), false)).toBeCloseTo(1.1 + 0.25 * Math.PI)
    expect(flightSeconds(a, orbitPose(dirOf({ lat: 0, lon: 180 }), 4.5), false)).toBe(2.4)
  })
})
