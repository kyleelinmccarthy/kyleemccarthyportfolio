import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three'
import { CAMERA_FOV, FOCUS, MODEL_SCALE, type Pose } from './camera'
import type { SurfaceFrame } from './geo'

/*
 * How the visitor's hands move the camera: one model for a mouse, a trackpad
 * and a finger. Every number a gesture is tuned by is here. CameraRig only
 * turns events into these calls.
 */

const D2R = Math.PI / 180

/** The planet's surface, as the rotate and zoom speeds see it: the sea's radius. */
export const PLANET_SURFACE = 1

/* ───────────── at a place ───────────── */

/**
 * At a place the camera circles a point `FOCUS.target` up the landmark: a drag
 * swings it round (`swing` radians per pixel across) and tilts it (`tilt`
 * radians per pixel down) between its lowest and `high` above the level; a pinch or
 * the wheel brings it between its nearest (clear of the landmark's footprint
 * by `margin`, never nearer than the landmark's top third filling the view)
 * and `far` times the distance it lands at. Its lowest is `low`, or higher
 * where that would take it into the ground, a building or a tree round the
 * place, by `clear` (`lowestElevation`), stepping up `lowStep` at a time.
 */
export const FOCUS_REACH = {
  swing: 0.006,
  tilt: 0.005,
  low: 4 * D2R,
  lowStep: 1 * D2R,
  clear: 0.04,
  high: 76 * D2R,
  far: 1.7,
  margin: 0.06,
  topShare: 1 / 3,
} as const

/**
 * Leaving a place by zooming out takes a gesture of its own. The camera stops
 * at its furthest; once it has rested there, with no zooming for `rest`
 * seconds, it is ready to leave (armed), and a gesture out from there that
 * goes `pull` further (in the log of the distance: about 30%) goes back to the
 * planet. No one event counts for more than `step` of that, so a single large
 * one (a fast flick, a page-sized scroll) cannot do it alone; a pause of `rest`
 * lets the pull go. So the gesture that brings the camera to the furthest,
 * however long, and a trackpad's inertial tail behind it, never leave. The keys
 * never do (Escape and the close link are the keyboard's way out).
 */
export const LEAVE = { pull: 0.26, rest: 0.4, step: 0.08 } as const

/** A double tap: the second tap down within `ms` of the first lifting, and within `px` of it. Either may have slipped up to `CLICK_SLOP`. */
export const DOUBLE_TAP = { ms: 300, px: 30 } as const

/** A reset after a double tap eases this share of the way a second (exponentially); under reduced motion it is instant. */
export const RESET_RATE = 7

/** The keys at a place: how far one press swings (radians), tilts (radians) and zooms (a factor). */
export const KEY_STEP = { swing: 15 * D2R, tilt: 8 * D2R, zoom: 1.18 } as const

/** What a key does at a place, if anything. Arrow keys belong to the tour and Escape to the way out, so neither is here. */
export type PlaceKey = { type: 'drag'; dx: number; dy: number } | { type: 'zoom'; scale: number; byKey: true } | { type: 'reset' }

/**
 * The key `key` at a place: `[` and `]` swing round, `{` and `}` tilt down and
 * up, `-` zooms out, `+` (or `=`, the same key unshifted) zooms in, and `0`
 * goes back to the view the place opens on. Null for any other key.
 */
export function placeKey(key: string): PlaceKey | null {
  const swing = KEY_STEP.swing / FOCUS_REACH.swing
  const tilt = KEY_STEP.tilt / FOCUS_REACH.tilt
  switch (key) {
    case '[':
      return { type: 'drag', dx: swing, dy: 0 }
    case ']':
      return { type: 'drag', dx: -swing, dy: 0 }
    case '{':
      return { type: 'drag', dx: 0, dy: -tilt }
    case '}':
      return { type: 'drag', dx: 0, dy: tilt }
    case '-':
    case '_':
      return { type: 'zoom', scale: KEY_STEP.zoom, byKey: true }
    case '+':
    case '=':
      return { type: 'zoom', scale: 1 / KEY_STEP.zoom, byKey: true }
    case '0':
      return { type: 'reset' }
    default:
      return null
  }
}

/**
 * How the camera may move at one place: the point it circles (`centre`, on the
 * place's up axis), the axes it turns about, the landmark's height and allowed
 * footprint, the elevation and distance it lands at, and the lowest elevation
 * it may tilt down to, in world units and radians. Azimuth 0 stands to the
 * south, as `focusPose` does.
 */
export interface FocusOrbit {
  ground: Vector3
  centre: Vector3
  up: Vector3
  south: Vector3
  height: number
  footprint: number
  elevation: number
  distance: number
  lowest: number
}

/**
 * The orbit round a landmark `modelHeight` model units tall on `ground`, its
 * allowed footprint `footprintModel` model units across from its axis. Its
 * lowest elevation is `FOCUS_REACH.low` until `lowestElevation` raises it.
 */
export function focusOrbit(ground: Vector3, frame: SurfaceFrame, modelHeight: number, footprintModel: number): FocusOrbit {
  const h = modelHeight * MODEL_SCALE
  const back = FOCUS.back + FOCUS.backPerHeight * h
  const rise = FOCUS.up + FOCUS.upPerHeight * h - FOCUS.target * h
  return {
    ground: ground.clone(),
    centre: ground.clone().addScaledVector(frame.up, FOCUS.target * h),
    up: frame.up.clone(),
    south: frame.south.clone(),
    height: h,
    footprint: footprintModel * MODEL_SCALE,
    elevation: Math.atan2(rise, back),
    distance: Math.hypot(back, rise),
    lowest: FOCUS_REACH.low,
  }
}

/**
 * Something standing round a place that the camera must not go into: its
 * direction from the centre, how far it reaches across the ground (radians,
 * as near as matters on a planet of radius 1), and how far from the centre its top is.
 */
export interface Obstacle {
  dir: Vector3
  reach: number
  top: number
}

/** Round each place this many azimuths and distances are tried when finding how low the camera may go. */
const LOWEST_SAMPLES = { azimuths: 36, distances: 6 } as const

/**
 * The lowest the camera may tilt at `orbit`: `FOCUS_REACH.low`, or higher, a
 * step at a time, until the camera keeps `FOCUS_REACH.clear` above the ground
 * (`groundAt`, the ground's distance from the centre in a direction) and above
 * every one of `obstacles` it would pass over, at every azimuth and every
 * distance it may take. Never higher than the elevation it lands at.
 */
export function lowestElevation(orbit: FocusOrbit, obstacles: Obstacle[], groundAt: (dir: Vector3) => number): number {
  const { clear, low, lowStep } = FOCUS_REACH
  // Only what stands within the furthest the camera goes can be in its way.
  const reach = farDistance(orbit) + clear
  const near = obstacles.filter((o) => o.dir.angleTo(orbit.up) <= reach + o.reach)
  const blocked = (eye: Vector3) => {
    const dir = eye.clone().normalize()
    if (eye.length() < groundAt(dir) + clear) return true
    return near.some((o) => dir.angleTo(o.dir) <= o.reach + clear && eye.length() < o.top + clear)
  }
  for (let e = low; e < orbit.elevation; e += lowStep) {
    const bounded = { ...orbit, lowest: e }
    const nearest = nearDistance(bounded, e)
    const furthest = farDistance(orbit)
    let clearAll = true
    for (let a = 0; a < LOWEST_SAMPLES.azimuths && clearAll; a++) {
      for (let s = 0; s <= LOWEST_SAMPLES.distances && clearAll; s++) {
        const d = nearest + ((furthest - nearest) * s) / LOWEST_SAMPLES.distances
        if (blocked(orbitPose(orbit, (a / LOWEST_SAMPLES.azimuths) * Math.PI * 2, e, d).position)) clearAll = false
      }
    }
    if (clearAll) return e
  }
  return orbit.elevation
}

/** Where the eye is in the half-plane through the place's axis: `out` from the axis and `rise` above the ground. */
export function eyeSpot(orbit: FocusOrbit, elevation: number, distance: number): { out: number; rise: number } {
  return { out: distance * Math.cos(elevation), rise: FOCUS.target * orbit.height + distance * Math.sin(elevation) }
}

/** The camera on `orbit`, `azimuth` round from the south, `elevation` above the level and `distance` from its centre, looking at the centre. */
export function orbitPose(orbit: FocusOrbit, azimuth: number, elevation: number, distance: number): Pose {
  const away = orbit.south.clone().applyAxisAngle(orbit.up, azimuth)
  const position = orbit.centre
    .clone()
    .addScaledVector(away, distance * Math.cos(elevation))
    .addScaledVector(orbit.up, distance * Math.sin(elevation))
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, orbit.centre, orbit.up))
  return { position, quaternion, up: orbit.up.clone() }
}

/** An elevation kept between the lowest the camera goes at `orbit` and the highest it goes anywhere. */
export function clampElevation(orbit: FocusOrbit, elevation: number): number {
  return MathUtils.clamp(elevation, orbit.lowest, FOCUS_REACH.high)
}

/**
 * The nearest the camera comes at `elevation`: never inside the landmark's
 * allowed footprint (a cylinder of its height), by `FOCUS_REACH.margin`, so it
 * stays out to the side of it or, looking down steeply enough, comes over its
 * top; and never so near that less than the top third of the landmark fills the view.
 */
export function nearDistance(orbit: FocusOrbit, elevation: number): number {
  const e = clampElevation(orbit, elevation)
  const { margin, topShare } = FOCUS_REACH
  const framed = (topShare * orbit.height) / (2 * Math.tan((CAMERA_FOV / 2) * D2R))
  const beside = (orbit.footprint + margin) / Math.cos(e)
  const over = ((1 - FOCUS.target) * orbit.height + margin) / Math.sin(e)
  return Math.max(framed, Math.min(beside, over))
}

/** The furthest the camera goes from the place before a further pull leaves it. */
export function farDistance(orbit: FocusOrbit): number {
  return orbit.distance * FOCUS_REACH.far
}

/* ───────────── zooming ───────────── */

/**
 * The wheel: `perPixel` of the log of the distance per pixel scrolled, a line
 * counting `line` pixels; a trackpad pinch (a wheel with ctrlKey, as browsers
 * send it) moves `pinchPerPixel`, so the view follows the fingers' spread.
 */
export const WHEEL = { perPixel: 0.0012, pinchPerPixel: 0.01, line: 16 } as const

/** The factor a wheel event multiplies the distance by: more than 1 is out. `page` is the height of a page, in pixels. */
export function wheelZoom(deltaY: number, deltaMode: number, ctrlKey: boolean, page: number): number {
  const px = deltaMode === 1 ? deltaY * WHEEL.line : deltaMode === 2 ? deltaY * page : deltaY
  const k = Math.exp(px * (ctrlKey ? WHEEL.pinchPerPixel : WHEEL.perPixel))
  return Number.isFinite(k) && k > 0 ? k : 1
}

/** The factor a two-finger pinch multiplies the distance by, as the fingers go from `before` to `after` pixels apart: apart is in. */
export function pinchZoom(before: number, after: number): number {
  if (!(before > 0) || !(after > 0) || !Number.isFinite(before) || !Number.isFinite(after)) return 1
  return before / after
}

/* ───────────── the planet ───────────── */

/**
 * OrbitControls turns the planet `rotateSpeed` × 2π radians for a drag the
 * height of the canvas. The ground under the finger stays under it when that
 * is the height of the view at the planet's surface: 2·tan(fov/2) times the
 * camera's distance from the surface. So it slows as the camera comes in.
 */
export function orbitRotateSpeed(distance: number): number {
  const fromSurface = Math.max(0, distance - PLANET_SURFACE)
  return (fromSurface * 2 * Math.tan((CAMERA_FOV / 2) * D2R)) / (2 * Math.PI)
}

/**
 * OrbitControls scales the distance to the centre by the fingers' spread to the
 * power `zoomSpeed`. The distance to the surface follows the spread when that
 * power is the share of the distance that lies above the surface; a wheel
 * goes `wheel` times as fast (its look-test speed, 0.7, at the desktop overview).
 */
export const ORBIT_ZOOM = { touch: 1, wheel: 0.9 } as const

export function orbitZoomSpeed(distance: number, touch: boolean): number {
  const above = distance > PLANET_SURFACE ? (distance - PLANET_SURFACE) / distance : 0
  return above * (touch ? ORBIT_ZOOM.touch : ORBIT_ZOOM.wheel)
}

/**
 * The nearest the visitor may zoom in on the planet: low enough over it that a
 * landmark is plain to see, above the low clouds and the tallest landmark.
 */
export const ORBIT_NEAREST = 1.6

/**
 * The planet turns on by itself only when the visitor has left it alone (`rigAutoRotates`) and
 * the camera is out at least this share of the overview's distance: zoomed in on something, it holds still.
 */
export const AUTO_ROTATE_FROM = 0.9

/**
 * A flick: when the finger (or the mouse) lets go, the planet coasts on at the
 * speed it was turning over the last `window` milliseconds, slowing away over
 * `seconds` (so it goes that many seconds' worth further in all), unless the
 * finger had rested more than `rest` milliseconds before it lifted. Never
 * faster than `fastest` radians a second; it stops below `stop`.
 */
export const COAST = { window: 100, rest: 80, seconds: 0.25, fastest: 6, stop: 0.01 } as const

/** One reading of where the planet was turned to: when (ms), its azimuth and polar angle (radians), as OrbitControls has them. */
export interface TurnSample {
  t: number
  theta: number
  phi: number
}

/** How fast the planet is turning, in radians a second, round (`theta`) and over (`phi`). */
export interface Spin {
  theta: number
  phi: number
}

export const STILL: Spin = { theta: 0, phi: 0 }

/** The shortest signed way from angle `a` to angle `b`. */
const turnFrom = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

/** How fast the planet was turning when a drag ended at `now`, from the readings taken during it. Still if it had come to rest. */
export function flickSpin(samples: TurnSample[], now: number): Spin {
  const last = samples[samples.length - 1]
  if (!last || now - last.t > COAST.rest) return STILL
  const first = samples.find((s) => last.t - s.t <= COAST.window)
  if (!first || first === last || last.t - first.t <= 0) return STILL
  const seconds = (last.t - first.t) / 1000
  const k = (x: number) => MathUtils.clamp(x / seconds, -COAST.fastest, COAST.fastest)
  return { theta: k(turnFrom(first.theta, last.theta)), phi: k(last.phi - first.phi) }
}

/** One frame `dt` seconds long of a coast at `spin`: how far it turns in that frame, and the spin after it. */
export function coastStep(spin: Spin, dt: number): { turn: Spin; spin: Spin } {
  if (!(dt > 0) || (Math.abs(spin.theta) < COAST.stop && Math.abs(spin.phi) < COAST.stop)) return { turn: STILL, spin: STILL }
  const fade = Math.exp(-dt / COAST.seconds)
  const share = COAST.seconds * (1 - fade)
  return { turn: { theta: spin.theta * share, phi: spin.phi * share }, spin: { theta: spin.theta * fade, phi: spin.phi * fade } }
}

/* ───────────── taps ───────────── */

/** A tap: where it was, and when (ms): for the first of two, when it lifted; for the second, when it went down. */
export interface Tap {
  x: number
  y: number
  t: number
}

/** True when `second` comes down soon enough after `first` lifted, and near enough to it, to make a double tap. */
export function isDoubleTap(first: Tap | null, second: Tap): boolean {
  if (!first) return false
  const dt = second.t - first.t
  return dt >= 0 && dt <= DOUBLE_TAP.ms && Math.hypot(second.x - first.x, second.y - first.y) <= DOUBLE_TAP.px
}

/*
 * The place's sheet on a phone: its numbers and decisions are in `./sheet`,
 * which imports nothing, so the panel can use them without bringing three.js
 * into every place page. Re-exported here so the gestures read as one set.
 */
export { SHEET_DRAG, SHEET_FULL, sheetAfterDrag, sheetViewOffset, type SheetState } from './sheet'
