import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { districts, places } from '@/content/world'
import { CAMERA_FOV, MODEL_SCALE, focusPose } from '@/lib/world/camera'
import { dirOf, surfaceFrame } from '@/lib/world/geo'
import { footprintRadius } from '@/lib/world/kit'
import { groundOf } from '@/lib/world/terrain'
import {
  COAST,
  DOUBLE_TAP,
  FOCUS_REACH,
  KEY_STEP,
  ORBIT_NEAREST,
  PLANET_SURFACE,
  SHEET_DRAG,
  WHEEL,
  STILL,
  clampElevation,
  coastStep,
  flickSpin,
  eyeSpot,
  farDistance,
  focusOrbit,
  isDoubleTap,
  lowestElevation,
  nearDistance,
  orbitPose,
  orbitRotateSpeed,
  orbitZoomSpeed,
  pinchZoom,
  placeKey,
  sheetAfterDrag,
  sheetViewOffset,
  wheelZoom,
} from '@/lib/world/gestures'

const orbitOf = (place: (typeof places)[number]) =>
  focusOrbit(groundOf(place.at, districts), surfaceFrame(dirOf(place.at)), place.height, footprintRadius(place.id, places))

describe('the orbit round a place', () => {
  it.each(places.map((p) => [p.id, p] as const))('lands %s exactly where the place’s camera always has, at every azimuth', (_, place) => {
    const orbit = orbitOf(place)
    const ground = groundOf(place.at, districts)
    const frame = surfaceFrame(dirOf(place.at))
    for (const azimuth of [0, 1, -2.5]) {
      const want = focusPose(ground, frame, place.height, azimuth)
      const got = orbitPose(orbit, azimuth, orbit.elevation, orbit.distance)
      expect(got.position.distanceTo(want.position)).toBeLessThan(1e-9)
      expect(got.quaternion.angleTo(want.quaternion)).toBeLessThan(1e-6)
    }
    // It opens within its own limits.
    expect(clampElevation(orbit, orbit.elevation)).toBe(orbit.elevation)
    expect(orbit.distance).toBeGreaterThan(nearDistance(orbit, orbit.elevation))
    expect(orbit.distance).toBeLessThan(farDistance(orbit))
  })

  it('keeps the place’s middle in the middle of the view from any elevation and distance', () => {
    const orbit = orbitOf(places[2])
    for (const e of [FOCUS_REACH.low, 0.6, FOCUS_REACH.high]) {
      for (const d of [nearDistance(orbit, e), orbit.distance, farDistance(orbit)]) {
        const pose = orbitPose(orbit, 0.7, e, d)
        const forward = new Vector3(0, 0, -1).applyQuaternion(pose.quaternion)
        const toCentre = orbit.centre.clone().sub(pose.position)
        expect(toCentre.length()).toBeCloseTo(d, 9)
        expect(forward.dot(toCentre.normalize())).toBeCloseTo(1, 9)
      }
    }
  })

  it('tilts between a low angle and nearly overhead', () => {
    const orbit = orbitOf(places[0])
    expect(orbit.lowest).toBe(FOCUS_REACH.low)
    expect(FOCUS_REACH.low).toBeGreaterThan(0)
    expect(FOCUS_REACH.low).toBeLessThan(orbit.elevation)
    expect(FOCUS_REACH.high).toBeLessThan(Math.PI / 2)
    expect(FOCUS_REACH.high).toBeGreaterThan((70 * Math.PI) / 180)
    expect(clampElevation(orbit, -1)).toBe(FOCUS_REACH.low)
    expect(clampElevation(orbit, 2)).toBe(FOCUS_REACH.high)
    expect(clampElevation(orbit, 0.5)).toBe(0.5)
    expect(clampElevation({ ...orbit, lowest: 0.2 }, 0.1)).toBe(0.2)
  })

  it.each(places.map((p) => [p.id, p] as const))('never brings the camera inside %s’s footprint, nor below its ground, from any elevation', (_, place) => {
    const orbit = orbitOf(place)
    for (let e = orbit.lowest; e <= FOCUS_REACH.high + 1e-9; e += 0.02) {
      const { out, rise } = eyeSpot(orbit, e, nearDistance(orbit, e))
      const beside = out >= orbit.footprint + FOCUS_REACH.margin - 1e-9
      const over = rise >= orbit.height + FOCUS_REACH.margin - 1e-9
      expect(beside || over, `elevation ${e.toFixed(2)}`).toBe(true)
      expect(rise).toBeGreaterThan(0)
    }
  })

  it('comes in close enough for the landmark’s top third to fill the view, and no closer', () => {
    // A landmark with no footprint to keep out of: only the framing holds the camera back.
    const orbit = { ...orbitOf(places[2]), footprint: -FOCUS_REACH.margin }
    const near = nearDistance(orbit, 0.3)
    const viewHeight = 2 * near * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
    expect(viewHeight).toBeCloseTo(orbit.height / 3, 9)
  })

  it('goes out to a fixed share further than it lands', () => {
    const orbit = orbitOf(places[0])
    expect(farDistance(orbit)).toBeCloseTo(orbit.distance * FOCUS_REACH.far, 12)
    expect(FOCUS_REACH.far).toBeGreaterThan(1.3)
  })

  it('tilts no lower than keeps the camera clear of the ground and of anything standing round the place', () => {
    const orbit = orbitOf(places[0])
    const flat = (dir: Vector3) => orbit.ground.length() + 0 * dir.x
    // Open, flat ground: as low as the camera ever goes.
    expect(lowestElevation(orbit, [], flat)).toBe(FOCUS_REACH.low)
    // A tall block standing just south of the place, where the camera passes: it must go over it.
    const south = orbit.ground.clone().addScaledVector(orbit.south, 0.3).normalize()
    const block = { dir: south, reach: 0.05, top: orbit.ground.length() + 0.12 }
    const lowest = lowestElevation(orbit, [block], flat)
    expect(lowest).toBeGreaterThan(FOCUS_REACH.low)
    for (let a = 0; a < 12; a++) {
      for (const d of [nearDistance({ ...orbit, lowest }, lowest), orbit.distance, farDistance(orbit)]) {
        const eye = orbitPose(orbit, (a / 12) * Math.PI * 2, lowest, d).position
        const over = eye.clone().normalize().angleTo(block.dir) <= block.reach + FOCUS_REACH.clear
        if (over) expect(eye.length()).toBeGreaterThanOrEqual(block.top + FOCUS_REACH.clear)
      }
    }
    // Something far away is no matter.
    const away = { dir: orbit.up.clone().negate(), reach: 0.3, top: 3 }
    expect(lowestElevation(orbit, [away], flat)).toBe(FOCUS_REACH.low)
    // Ground that rises all round: never higher than the elevation the place opens on.
    expect(lowestElevation(orbit, [], () => 5)).toBe(orbit.elevation)
  })
})

describe('keys at a place', () => {
  it('swings with the brackets, tilts with the braces, zooms with minus and plus, and resets with 0', () => {
    expect(placeKey('[')).toEqual({ type: 'drag', dx: KEY_STEP.swing / FOCUS_REACH.swing, dy: 0 })
    expect(placeKey(']')).toEqual({ type: 'drag', dx: -KEY_STEP.swing / FOCUS_REACH.swing, dy: 0 })
    expect(placeKey('{')).toEqual({ type: 'drag', dx: 0, dy: -KEY_STEP.tilt / FOCUS_REACH.tilt })
    expect(placeKey('}')).toEqual({ type: 'drag', dx: 0, dy: KEY_STEP.tilt / FOCUS_REACH.tilt })
    // Marked as the keys', which never leave the place (`LEAVE`).
    expect(placeKey('-')).toEqual({ type: 'zoom', scale: KEY_STEP.zoom, byKey: true })
    expect(placeKey('+')).toEqual({ type: 'zoom', scale: 1 / KEY_STEP.zoom, byKey: true })
    expect(placeKey('=')).toEqual(placeKey('+'))
    expect(placeKey('0')).toEqual({ type: 'reset' })
  })

  it('leaves the tour’s arrows and Escape alone', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Enter', ' ', 'Tab', 'a']) expect(placeKey(key), key).toBeNull()
  })
})

describe('zooming', () => {
  it('scrolls out by a share of the distance per pixel, and in by the same share', () => {
    expect(wheelZoom(100, 0, false, 800)).toBeCloseTo(Math.exp(100 * WHEEL.perPixel), 12)
    expect(wheelZoom(-100, 0, false, 800) * wheelZoom(100, 0, false, 800)).toBeCloseTo(1, 12)
    expect(wheelZoom(0, 0, false, 800)).toBe(1)
    // A line is 16 pixels; a page is the page's height.
    expect(wheelZoom(3, 1, false, 800)).toBeCloseTo(wheelZoom(48, 0, false, 800), 12)
    expect(wheelZoom(1, 2, false, 800)).toBeCloseTo(wheelZoom(800, 0, false, 800), 12)
  })

  it('follows a trackpad pinch faster than a scroll, so the view keeps up with the fingers', () => {
    expect(wheelZoom(-10, 0, true, 800)).toBeCloseTo(Math.exp(-10 * WHEEL.pinchPerPixel), 12)
    expect(wheelZoom(-10, 0, true, 800)).toBeLessThan(wheelZoom(-10, 0, false, 800))
  })

  it('ignores a wheel event it cannot read', () => {
    expect(wheelZoom(NaN, 0, false, 800)).toBe(1)
    expect(wheelZoom(1e9, 0, false, 800)).toBe(1)
  })

  it('pinches in proportion to the fingers’ spread: apart is in, together is out', () => {
    expect(pinchZoom(100, 200)).toBeCloseTo(0.5)
    expect(pinchZoom(200, 100)).toBeCloseTo(2)
    expect(pinchZoom(150, 150)).toBe(1)
    for (const [a, b] of [[0, 100], [100, 0], [NaN, 10], [10, Infinity]]) expect(pinchZoom(a, b)).toBe(1)
  })
})

describe('turning the planet', () => {
  /** Pixels the ground straight below the camera moves for a drag of `px` on a canvas `height` tall, at `distance`. */
  function groundMoves(distance: number, px: number, height: number) {
    const angle = (2 * Math.PI * orbitRotateSpeed(distance) * px) / height
    const viewHeightAtSurface = 2 * (distance - PLANET_SURFACE) * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
    return (angle * PLANET_SURFACE * height) / viewHeightAtSurface
  }

  it('keeps the ground under the finger at every distance', () => {
    for (const distance of [ORBIT_NEAREST, 2.75, 4.5, 9.1, 13]) expect(groundMoves(distance, 120, 915)).toBeCloseTo(120, 6)
  })

  it('turns slower close in than far out', () => {
    expect(orbitRotateSpeed(ORBIT_NEAREST)).toBeLessThan(orbitRotateSpeed(4.5))
    expect(orbitRotateSpeed(4.5)).toBeLessThan(orbitRotateSpeed(9))
    expect(orbitRotateSpeed(0.5)).toBe(0)
  })

  it('pinches the distance to the surface in proportion to the fingers, and scrolls as the look test did at the overview', () => {
    for (const distance of [ORBIT_NEAREST, 4.5, 9]) {
      const spread = 1.25
      const after = distance / Math.pow(spread, orbitZoomSpeed(distance, true))
      // To first order the height over the surface follows the spread.
      expect((distance - PLANET_SURFACE) / (after - PLANET_SURFACE)).toBeCloseTo(spread, 1)
    }
    expect(orbitZoomSpeed(4.5, false)).toBeCloseTo(0.7, 2)
    expect(orbitZoomSpeed(0.9, true)).toBe(0)
  })

  it('comes in low enough to see a landmark, but stays above the low clouds and the tallest landmark', () => {
    expect(ORBIT_NEAREST).toBeLessThan(2.1)
    const tallest = Math.max(...places.map((p) => groundOf(p.at, districts).length() + p.height * MODEL_SCALE))
    expect(ORBIT_NEAREST).toBeGreaterThan(Math.max(1.24 + 0.1, tallest + 0.2))
  })

  it('coasts after a flick at the speed it was turning, and not at all after the finger came to rest', () => {
    const flick = [
      { t: 0, theta: 0, phi: 1 },
      { t: 50, theta: 0.05, phi: 1.01 },
      { t: 100, theta: 0.1, phi: 1.02 },
    ]
    const spin = flickSpin(flick, 110)
    expect(spin.theta).toBeCloseTo(1, 9)
    expect(spin.phi).toBeCloseTo(0.2, 9)
    // Only the last moments count: an early slow stretch does not drag the speed down.
    expect(flickSpin([{ t: -500, theta: -3, phi: 1 }, ...flick], 110).theta).toBeCloseTo(1, 9)
    // Rested before lifting: no coast.
    expect(flickSpin(flick, 100 + COAST.rest + 1)).toEqual(STILL)
    // Nothing to go on.
    expect(flickSpin([], 0)).toEqual(STILL)
    expect(flickSpin([flick[0]], 0)).toEqual(STILL)
  })

  it('coasts the short way across the turn’s seam, and never wildly fast', () => {
    const seam = [
      { t: 0, theta: Math.PI - 0.01, phi: 1 },
      { t: 50, theta: -Math.PI + 0.01, phi: 1 },
    ]
    expect(flickSpin(seam, 50).theta).toBeCloseTo(0.4, 9)
    const wild = [
      { t: 0, theta: 0, phi: 0 },
      { t: 10, theta: 2, phi: 0 },
    ]
    expect(flickSpin(wild, 10).theta).toBe(COAST.fastest)
  })

  it('slows a coast away to nothing, going the same way however the frames fall', () => {
    const spin = { theta: 2, phi: -0.5 }
    const travel = (dt: number) => {
      let s = spin
      let theta = 0
      let phi = 0
      for (let t = 0; t < 3; t += dt) {
        const step = coastStep(s, dt)
        theta += step.turn.theta
        phi += step.turn.phi
        s = step.spin
      }
      return { theta, phi, s }
    }
    const smooth = travel(1 / 60)
    const rough = travel(1 / 10)
    // In all it goes `seconds` worth of the speed it started at.
    expect(smooth.theta).toBeCloseTo(2 * COAST.seconds, 2)
    expect(smooth.phi).toBeCloseTo(-0.5 * COAST.seconds, 2)
    expect(rough.theta).toBeCloseTo(smooth.theta, 2)
    expect(smooth.s).toEqual(STILL)
    expect(coastStep(spin, 0)).toEqual({ turn: STILL, spin: STILL })
  })
})

describe('double taps', () => {
  it('counts a second tap soon after and near the first', () => {
    const first = { x: 100, y: 100, t: 1000 }
    expect(isDoubleTap(first, { x: 110, y: 95, t: 1200 })).toBe(true)
    expect(isDoubleTap(first, { x: 100, y: 100, t: 1000 + DOUBLE_TAP.ms + 1 })).toBe(false)
    expect(isDoubleTap(first, { x: 100 + DOUBLE_TAP.px + 1, y: 100, t: 1100 })).toBe(false)
    expect(isDoubleTap(null, first)).toBe(false)
    expect(isDoubleTap(first, { x: 100, y: 100, t: 900 })).toBe(false)
  })
})

describe('the sheet on a phone', () => {
  it('moves the view up by half what the sheet covers, so the landmark sits in the middle of the rest', () => {
    expect(sheetViewOffset(915 - 228, 915)).toBe(114)
    expect(sheetViewOffset(915 * 0.42, 915)).toBeCloseTo((915 * 0.58) / 2)
    expect(sheetViewOffset(null, 915)).toBe(0)
    expect(sheetViewOffset(1000, 915)).toBe(0)
    expect(sheetViewOffset(-20, 915)).toBe(457.5)
    expect(sheetViewOffset(NaN, 915)).toBe(0)
    expect(sheetViewOffset(300, 0)).toBe(0)
  })

  it('opens when its handle is dragged up, closes to the peek when dragged down, and stays put for a short slip', () => {
    expect(sheetAfterDrag('peek', -SHEET_DRAG)).toBe('full')
    expect(sheetAfterDrag('full', SHEET_DRAG)).toBe('peek')
    expect(sheetAfterDrag('peek', SHEET_DRAG + 40)).toBe('peek')
    expect(sheetAfterDrag('full', -SHEET_DRAG - 40)).toBe('full')
    expect(sheetAfterDrag('peek', -SHEET_DRAG + 1)).toBe('peek')
    expect(sheetAfterDrag('full', SHEET_DRAG - 1)).toBe('full')
  })
})
