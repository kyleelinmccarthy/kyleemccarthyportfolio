import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three'
import type { SurfaceFrame } from './geo'

/** World units per model unit. */
export const MODEL_SCALE = 0.088

/** Where the camera sits and which way it faces. Forward is the pose's local -Z, as for a camera. */
export interface Pose {
  position: Vector3
  quaternion: Quaternion
  up: Vector3
}

const WORLD_UP = new Vector3(0, 1, 0)
const CENTRE = new Vector3(0, 0, 0)

/** Orientation for a camera at `eye` looking at `target`, `up` keeping it level. */
function lookRotation(eye: Vector3, target: Vector3, up: Vector3): Quaternion {
  return new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(eye, target, up))
}

/** The camera's vertical field of view, in degrees. */
export const CAMERA_FOV = 35
/**
 * The furthest the camera ever sits from the centre: inside the far clouds
 * (the nearest of their puffs comes to about 13.6), so none can come between
 * the camera and the planet. At this distance the planet still fits across a
 * window down to an aspect of about 0.3.
 */
export const FARTHEST = 13
/** How much further out than the overview the visitor may zoom, where the window leaves room. */
export const ZOOM_OUT_ROOM = 2.5

/** An aspect that can be divided by: a window with no width or height counts as square. */
const usableAspect = (aspect: number) => (Number.isFinite(aspect) && aspect > 0 ? aspect : 1)

/** How far out the overview sits so the whole planet fits, pulling back on narrow screens, never past `FARTHEST`. */
export function overviewDistance(aspect: number): number {
  return Math.min(FARTHEST, Math.max(4.5, 4.1 / Math.min(1.25, usableAspect(aspect))))
}

/**
 * The furthest the visitor may zoom out: `ZOOM_OUT_ROOM` past the overview,
 * but never past `FARTHEST`. In windows narrower than an aspect of about 0.39
 * the room shrinks, and below about 0.32 there is none.
 */
export function maxDistance(aspect: number): number {
  return Math.min(FARTHEST, overviewDistance(aspect) + ZOOM_OUT_ROOM)
}

/** Out in space along `dir`, looking at the centre with world-up. Never exactly over a pole. */
export function orbitPose(dir: Vector3, distance: number): Pose {
  const position = dir.clone().normalize()
  // Straight over a pole there is no way round to lean towards; lean towards longitude 0.
  if (Math.hypot(position.x, position.z) < 1e-9) position.x = 1
  position.y = MathUtils.clamp(position.y, -0.9, 0.9)
  position.normalize().multiplyScalar(distance)
  const up = WORLD_UP.clone()
  return { position, quaternion: lookRotation(position, CENTRE, up), up }
}

/**
 * Where the camera stands at a place, in world units, for a landmark `h`
 * world units tall: `back` plus `backPerHeight` × h back across the ground,
 * `up` plus `upPerHeight` × h above it, looking at `target` × h up the
 * landmark. The fixed parts are small, so a short landmark is framed nearly as
 * large as a tall one: at least `minSizeRatio` of its apparent height, from
 * 1.0 model units tall to 2.5.
 */
export const FOCUS = { back: 0.2, backPerHeight: 3.2, up: 0.12, upPerHeight: 1.2, target: 0.55, minSizeRatio: 0.6 } as const

/**
 * Close to a place: above the ground and back from it, looking at it level with the local up.
 * Azimuth 0 stands to the south; turning it walks the camera round the place.
 */
export function focusPose(ground: Vector3, frame: SurfaceFrame, modelHeight: number, azimuth: number): Pose {
  const h = modelHeight * MODEL_SCALE
  const away = frame.south.clone().applyAxisAngle(frame.up, azimuth)
  const position = ground.clone().addScaledVector(frame.up, FOCUS.up + FOCUS.upPerHeight * h).addScaledVector(away, FOCUS.back + FOCUS.backPerHeight * h)
  const target = ground.clone().addScaledVector(frame.up, FOCUS.target * h)
  const up = frame.up.clone()
  return { position, quaternion: lookRotation(position, target, up), up }
}

/**
 * Where `focusPose` puts the camera for a landmark `modelHeight` tall, in the
 * landmark's own model units (`MODEL_SCALE`): `back` in front of its origin
 * (along +Z, the front, at azimuth 0) and `up` above its ground. A landmark
 * uses it to keep a part in view under something that overhangs it.
 */
export function focusEye(modelHeight: number): { back: number; up: number } {
  const h = modelHeight * MODEL_SCALE
  return { back: (FOCUS.back + FOCUS.backPerHeight * h) / MODEL_SCALE, up: (FOCUS.up + FOCUS.upPerHeight * h) / MODEL_SCALE }
}

export function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}

/** Angle in radians between the directions of two poses, seen from the centre. */
function arcAngle(from: Pose, to: Pose): number {
  return from.position.clone().normalize().angleTo(to.position.clone().normalize())
}

/**
 * The camera `k` of the way (0..1) through a flight. It swings round the centre rather than
 * cutting across, lifting higher the further it goes, so it never passes through the planet.
 */
export function flightAt(from: Pose, to: Pose, k: number): { position: Vector3; quaternion: Quaternion } {
  const t = MathUtils.clamp(k, 0, 1)
  if (t === 0) return { position: from.position.clone(), quaternion: from.quaternion.clone() }
  if (t === 1) return { position: to.position.clone(), quaternion: to.quaternion.clone() }

  const e = easeInOutCubic(t)
  const d0 = from.position.clone().normalize()
  const d1 = to.position.clone().normalize()
  const r0 = from.position.length()
  const r1 = to.position.length()
  // setFromUnitVectors copes with equal (identity) and opposite (half turn) directions.
  const turn = new Quaternion().slerp(new Quaternion().setFromUnitVectors(d0, d1), e)
  const lift = Math.max(0, 1.7 + 0.55 * d0.angleTo(d1) - (r0 + r1) / 2)
  const radius = MathUtils.lerp(r0, r1, e) + Math.sin(Math.PI * e) * lift

  return {
    position: d0.applyQuaternion(turn).multiplyScalar(radius),
    quaternion: new Quaternion().slerpQuaternions(from.quaternion, to.quaternion, e),
  }
}

/** How long a flight takes: longer for longer arcs, capped. Zero under reduced motion. */
export function flightSeconds(from: Pose, to: Pose, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  return Math.min(2.4, 1.1 + 0.5 * arcAngle(from, to))
}
