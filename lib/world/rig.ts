import { Quaternion, Vector3 } from 'three'
import type { District, Place } from '@/content/types'
import { flightAt, focusPose, orbitPose, type Pose } from './camera'
import { dirOf, surfaceFrame } from './geo'
import { groundOf } from './terrain'

/**
 * The camera rig's decisions, kept apart from the canvas so they can be tested.
 * orbit: three's OrbitControls hold the camera. fly: the rig is carrying it to
 * a goal. focus: it rests at a place, and a drag walks it round.
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
}

export type RigEvent =
  | { type: 'route'; placeId: string | null; current: Pose; goal: Pose; seconds: number }
  | { type: 'tick'; dt: number }
  | { type: 'drag'; dx: number }
  | { type: 'touch' }

/** A frame longer than this (a background tab, a stall) moves the camera no further than this would. */
export const MAX_TICK = 0.1
/** Radians round the place per pixel dragged. */
const DRAG_RADIANS = 0.006
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
export const RIG_START: RigState = { mode: 'orbit', target: null, flight: null, azimuth: 0, idle: Infinity }

export function rigReduce(state: RigState, event: RigEvent): RigState {
  switch (event.type) {
    case 'route': {
      const flight = { from: event.current, to: event.goal, elapsed: 0, seconds: event.seconds }
      const next: RigState = { ...state, mode: 'fly', target: event.placeId, flight, azimuth: 0 }
      return event.seconds > 0 ? next : land(next)
    }
    case 'tick': {
      const dt = Math.min(Math.max(event.dt, 0), MAX_TICK)
      const idle = state.idle + dt
      if (state.mode !== 'fly' || !state.flight) return { ...state, idle }
      const flight = { ...state.flight, elapsed: state.flight.elapsed + dt }
      const next: RigState = { ...state, flight, idle }
      return flight.elapsed >= flight.seconds ? land(next) : next
    }
    case 'drag':
      return state.mode === 'focus' ? { ...state, azimuth: state.azimuth - event.dx * DRAG_RADIANS } : state
    case 'touch':
      return { ...state, idle: 0 }
  }
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
 * In focus it is the landing pose turned round the place's own up: that axis
 * runs through the centre of the planet and the place, so turning about it
 * walks the camera round the place exactly as `focusPose`'s azimuth would.
 */
export function rigPose(state: RigState): { position: Vector3; quaternion: Quaternion } | null {
  const { flight } = state
  if (state.mode === 'orbit' || !flight) return null
  if (state.mode === 'fly') return flightAt(flight.from, flight.to, flight.seconds > 0 ? flight.elapsed / flight.seconds : 1)
  const turn = new Quaternion().setFromAxisAngle(flight.to.up, state.azimuth)
  return {
    position: flight.to.position.clone().applyQuaternion(turn),
    quaternion: turn.multiply(flight.to.quaternion),
  }
}

/** Whether the planet should be turning by itself: in orbit, once the visitor has left it alone a while. */
export function rigAutoRotates(state: RigState): boolean {
  return state.mode === 'orbit' && state.idle >= AUTO_ROTATE_IDLE
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
