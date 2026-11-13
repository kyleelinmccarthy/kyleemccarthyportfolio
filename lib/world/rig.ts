import { MathUtils, Quaternion, Vector3 } from 'three'
import type { District, Place } from '@/content/types'
import { MODEL_SCALE, flightAt, focusPose, orbitPose, type Pose } from './camera'
import { dirOf, surfaceFrame } from './geo'
import {
  FOCUS_REACH,
  LEAVE,
  RESET_RATE,
  clampElevation,
  farDistance,
  focusOrbit,
  lowestElevation,
  nearDistance,
  orbitPose as focusOrbitPose,
  type FocusOrbit,
  type Obstacle,
} from './gestures'
import { footprintRadius } from './kit'
import { reachOf, sceneryLayout } from './scatter'
import { groundOf, heightAt } from './terrain'

/**
 * The camera rig's decisions, kept apart from the canvas so they can be tested.
 * orbit: three's OrbitControls hold the camera. fly: the rig is carrying it to
 * a goal. focus: it rests at a place, and a drag swings it round and tilts it,
 * a pinch or the wheel brings it in and out, and a double tap sets it back.
 */
export type RigMode = 'orbit' | 'fly' | 'focus'

export interface RigState {
  mode: RigMode
  /** The place in focus, or being flown to. Null at the planet. */
  target: string | null
  /**
   * The flight under way. In focus, the flight that landed here: its `to` is
   * the pose a drag walks round from. Null in orbit.
   */
  flight: { from: Pose; to: Pose; elapsed: number; seconds: number } | null
  /** How far round the place a drag has walked the camera, in radians. */
  azimuth: number
  /** Seconds since the visitor last touched the controls or the camera last landed in orbit. */
  idle: number
  /** How the camera may move at the place in focus or being flown to; null where it is not known (or at the planet). */
  orbit: FocusOrbit | null
  /** At a place: the camera's elevation above the level round the place's middle (radians), and its distance from it. */
  elevation: number
  distance: number
  /**
   * Leaving by zooming out (`LEAVE`): how far the gesture under way has gone out past the furthest (in the log of
   * the distance), the seconds since the visitor last zoomed, and whether the camera has rested at the furthest, so
   * a new gesture out may leave.
   */
  pull: number
  sinceZoom: number
  armed: boolean
  /** Easing back to the view the place opens on. */
  resetting: boolean
}

export type RigEvent =
  | { type: 'route'; placeId: string | null; current: Pose; goal: Pose; seconds: number; orbit?: FocusOrbit | null }
  | { type: 'tick'; dt: number }
  | { type: 'drag'; dx: number; dy?: number }
  /** `byKey`: from the keyboard, which zooms but never leaves the place. */
  | { type: 'zoom'; scale: number; byKey?: boolean }
  | { type: 'reset'; ease: boolean }
  | { type: 'touch' }

/** A frame longer than this (a background tab, a stall) moves the camera no further than this would. */
export const MAX_TICK = 0.1
/** The planet starts turning by itself again after this many seconds untouched. */
export const AUTO_ROTATE_IDLE = 9
/** The camera keeps this far (radians) from either pole: OrbitControls' polar limits are this and π minus this. */
export const POLAR_LIMIT = 0.15 * Math.PI
/** A pointer that moved more than this many pixels between down and up was dragging, not clicking. */
export const CLICK_SLOP = 6
/** How far out the camera sits when it turns an island towards the visitor. */
const ISLAND_DISTANCE = 2.75
/** It looks at an island from this many degrees south of its centre, so the island sits above the middle. */
const ISLAND_SOUTH = 9

/** Before anything happens: the controls hold the camera and the planet turns. */
export const RIG_START: RigState = {
  mode: 'orbit',
  target: null,
  flight: null,
  azimuth: 0,
  idle: Infinity,
  orbit: null,
  elevation: 0,
  distance: 0,
  pull: 0,
  sinceZoom: 0,
  armed: false,
  resetting: false,
}

/** An eased reset this close (radians, and as a share of the distance) to the landing view is there. */
const RESET_DONE = 1e-4

export function rigReduce(state: RigState, event: RigEvent): RigState {
  switch (event.type) {
    case 'route': {
      const flight = { from: event.current, to: event.goal, elapsed: 0, seconds: event.seconds }
      const orbit = event.placeId !== null ? (event.orbit ?? null) : null
      const next: RigState = {
        ...state,
        mode: 'fly',
        target: event.placeId,
        flight,
        azimuth: 0,
        orbit,
        elevation: orbit?.elevation ?? 0,
        distance: orbit?.distance ?? 0,
        pull: 0,
        sinceZoom: 0,
        armed: false,
        resetting: false,
      }
      return event.seconds > 0 ? next : land(next)
    }
    case 'tick': {
      const dt = Math.min(Math.max(event.dt, 0), MAX_TICK)
      const idle = state.idle + dt
      if (state.mode === 'focus') return settle({ ...state, idle }, dt)
      if (state.mode !== 'fly' || !state.flight) return { ...state, idle }
      const flight = { ...state.flight, elapsed: state.flight.elapsed + dt }
      const next: RigState = { ...state, flight, idle }
      return flight.elapsed >= flight.seconds ? land(next) : next
    }
    case 'drag': {
      if (state.mode !== 'focus') return state
      const azimuth = state.azimuth - event.dx * FOCUS_REACH.swing
      const { orbit } = state
      if (!orbit) return { ...state, azimuth, resetting: false }
      const elevation = clampElevation(orbit, state.elevation + (event.dy ?? 0) * FOCUS_REACH.tilt)
      // Tilting changes how near the landmark lets the camera come.
      const distance = MathUtils.clamp(state.distance, nearDistance(orbit, elevation), farDistance(orbit))
      return { ...state, azimuth, elevation, distance, resetting: false }
    }
    case 'zoom': {
      const { orbit } = state
      if (state.mode !== 'focus' || !orbit || !(event.scale > 0) || !Number.isFinite(event.scale)) return state
      const far = farDistance(orbit)
      const wanted = state.distance * event.scale
      const distance = MathUtils.clamp(wanted, nearDistance(orbit, state.elevation), far)
      const zoomed = { ...state, distance, sinceZoom: 0, resetting: false }
      // In, or by the keys: no leaving. In also means the camera no longer rests at the furthest.
      if (event.scale < 1) return { ...zoomed, pull: 0, armed: false }
      if (event.byKey) return { ...zoomed, pull: 0 }
      // Out past the furthest builds the pull only once the camera has rested there (armed), a step at most an event.
      const past = state.armed && wanted > far ? Math.min(Math.log(wanted / far), LEAVE.step) : 0
      return { ...zoomed, pull: state.pull + past }
    }
    case 'reset': {
      const { orbit } = state
      if (state.mode !== 'focus' || !orbit) return state
      const calm = { pull: 0, armed: false, sinceZoom: 0 }
      if (event.ease) return { ...state, ...calm, azimuth: Math.atan2(Math.sin(state.azimuth), Math.cos(state.azimuth)), resetting: true }
      return { ...state, ...calm, azimuth: 0, elevation: orbit.elevation, distance: orbit.distance, resetting: false }
    }
    case 'touch':
      return { ...state, idle: 0 }
  }
}

/**
 * A frame at a place. After a pause in zooming the pull is let go, and the camera is ready to leave (armed) if it
 * rests at the furthest. An eased reset moves on.
 */
function settle(state: RigState, dt: number): RigState {
  const { orbit } = state
  const sinceZoom = state.sinceZoom + dt
  const paused = sinceZoom >= LEAVE.rest
  const atFurthest = orbit !== null && state.distance >= farDistance(orbit) * (1 - 1e-9)
  const next = { ...state, sinceZoom, pull: paused ? 0 : state.pull, armed: paused ? atFurthest : state.armed && atFurthest }
  if (!state.resetting || !orbit) return next
  const k = 1 - Math.exp(-RESET_RATE * dt)
  const azimuth = MathUtils.lerp(state.azimuth, 0, k)
  const elevation = MathUtils.lerp(state.elevation, orbit.elevation, k)
  // In and out by the same share of the distance whichever way it goes.
  const distance = orbit.distance * Math.exp(MathUtils.lerp(Math.log(state.distance / orbit.distance), 0, k))
  const done =
    Math.abs(azimuth) < RESET_DONE && Math.abs(elevation - orbit.elevation) < RESET_DONE && Math.abs(distance / orbit.distance - 1) < RESET_DONE
  if (done) return { ...next, azimuth: 0, elevation: orbit.elevation, distance: orbit.distance, resetting: false }
  return { ...next, azimuth, elevation, distance }
}

/** True once the visitor has zoomed out past the furthest at a place by enough to mean it: the canvas then goes back to the planet. */
export function rigLeaves(state: RigState): boolean {
  return state.mode === 'focus' && state.pull >= LEAVE.pull
}

/** True while the camera rests at the furthest at a place, so that a new gesture out would leave it. */
export function rigArmed(state: RigState): boolean {
  return state.mode === 'focus' && state.armed
}

/** The end of a flight: in focus on its place, or back in orbit with the controls. */
function land(state: RigState): RigState {
  if (state.target !== null && state.flight) {
    return { ...state, mode: 'focus', flight: { ...state.flight, elapsed: state.flight.seconds } }
  }
  return { ...state, mode: 'orbit', flight: null, idle: 0 }
}

/**
 * Where the rig puts the camera this frame, or null in orbit, where the controls own it.
 * In focus it is on the place's orbit at the swing, tilt and distance the
 * visitor has given it, which before any gesture is the pose it landed on.
 * Without an orbit it is the landing pose turned round the place's own up:
 * that axis runs through the centre of the planet and the place, so turning
 * about it walks the camera round the place exactly as `focusPose`'s azimuth would.
 */
export function rigPose(state: RigState): { position: Vector3; quaternion: Quaternion } | null {
  const { flight } = state
  if (state.mode === 'orbit' || !flight) return null
  if (state.mode === 'fly') return flightAt(flight.from, flight.to, flight.seconds > 0 ? flight.elapsed / flight.seconds : 1)
  if (state.orbit) {
    const { position, quaternion } = focusOrbitPose(state.orbit, state.azimuth, state.elevation, state.distance)
    return { position, quaternion }
  }
  const turn = new Quaternion().setFromAxisAngle(flight.to.up, state.azimuth)
  return {
    position: flight.to.position.clone().applyQuaternion(turn),
    quaternion: turn.multiply(flight.to.quaternion),
  }
}

/**
 * Whether the planet should be turning by itself: in orbit, once the visitor
 * has left it alone a while, and not while they are zoomed in on something (`zoomedIn`).
 */
export function rigAutoRotates(state: RigState, zoomedIn = false): boolean {
  return state.mode === 'orbit' && state.idle >= AUTO_ROTATE_IDLE && !zoomedIn
}

/** True if a pointer that moved `distance` pixels between down and up was a click. */
export function isClick(distance: number): boolean {
  return distance <= CLICK_SLOP
}

/**
 * The flight under way, re-aimed to end `distance` from the centre in the same
 * direction and facing (for a flight home when the screen changes shape and
 * the overview moves). Anything but a flight is returned as it is.
 */
export function retargetFlight(state: RigState, distance: number): RigState {
  const { flight } = state
  if (state.mode !== 'fly' || !flight) return state
  const position = flight.to.position.clone().setLength(distance)
  return { ...state, flight: { ...flight, to: { ...flight.to, position } } }
}

/** Close to a place, facing it from the south, standing on its ground. */
export function placeGoal(place: Place, districts: District[]): Pose {
  return focusPose(groundOf(place.at, districts), surfaceFrame(dirOf(place.at)), place.height, 0)
}

const sceneryCache = new WeakMap<Place[], Map<District[], Obstacle[]>>()

/**
 * Every building and tree on the planet, as something the camera at a place must keep out of: the very layout the
 * planet draws (`sceneryLayout`). The same for the same places and districts.
 */
export function sceneryObstacles(districts: District[], places: Place[]): Obstacle[] {
  let byDistricts = sceneryCache.get(places)
  if (!byDistricts) sceneryCache.set(places, (byDistricts = new Map()))
  let obstacles = byDistricts.get(districts)
  if (!obstacles) {
    const { buildings, trees } = sceneryLayout(districts, places)
    obstacles = [...buildings, ...trees].map((x) => {
      const dir = x.dir.clone().normalize()
      return { dir, reach: reachOf(x) * MODEL_SCALE, top: 1 + heightAt(dir, districts) + x.height * MODEL_SCALE }
    })
    byDistricts.set(districts, obstacles)
  }
  return obstacles
}

/**
 * How the camera may move at a place: round its landmark, clear of its
 * footprint, and no lower than keeps it out of the ground and the buildings
 * and trees round it.
 */
export function placeOrbit(place: Place, districts: District[], places: Place[]): FocusOrbit {
  const orbit = focusOrbit(groundOf(place.at, districts), surfaceFrame(dirOf(place.at)), place.height, footprintRadius(place.id, places))
  const lowest = lowestElevation(orbit, sceneryObstacles(districts, places), (dir) => 1 + heightAt(dir, districts))
  return { ...orbit, lowest }
}

/** Out in space with an island turned towards the camera. */
export function districtGoal(district: District): Pose {
  const { lat, lon } = district.center
  return orbitPose(dirOf({ lat: lat - ISLAND_SOUTH, lon }), ISLAND_DISTANCE)
}

/**
 * Straight back out from `from` to `distance`, kept inside the controls' polar
 * limits so the controls take over from the very pose the flight ends on.
 */
export function homeGoal(from: Vector3, distance: number): Pose {
  const dir = from.clone().normalize()
  const maxY = Math.cos(POLAR_LIMIT)
  if (Math.abs(dir.y) > maxY) {
    let across = Math.hypot(dir.x, dir.z)
    if (across < 1e-9) {
      dir.set(1, dir.y, 0)
      across = 1
    }
    const k = Math.sqrt(1 - maxY * maxY) / across
    dir.set(dir.x * k, Math.sign(dir.y) * maxY, dir.z * k)
  }
  return orbitPose(dir, distance)
}
