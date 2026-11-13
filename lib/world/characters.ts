import { Vector3 } from 'three'
import { defaultStand, standAt, type Look, type Spot, type Stand } from '@/content/characters'
import type { District, Place } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { characterHeight } from './figure'
import { dirOf, surfaceFrame } from './geo'
import { groundOf, heightAt } from './terrain'

/*
 * The characters as data: which looks there are, where each stands at a place
 * and which way it faces, where the guide's head is in the world (for her
 * speech bubble), and what the pair may cost to draw. Pure: three's maths only.
 */

// A character's height lives with its proportions (an age changes both).
export { ADULT_HEIGHT, characterHeight } from './figure'

/**
 * What the two characters may draw together, at a place, outlines included:
 * the guide and the visitor's character in any of the looks, the guide waving.
 * A little more than one landmark may draw (`TRIANGLE_BUDGET`), the guide's
 * long hair being fourteen locks: the pair stand at one place at a time. Apart from the landmarks' own budgets
 * (`PLANET_TRIANGLE_BUDGET` in kit.ts), which they are not part of.
 */
export const COMPANION_TRIANGLE_BUDGET = 27_000
/** Draw calls for the pair once batched, as the landmarks' `DRAW_BUDGET`: one per material each figure uses, plus each live (moving) part. */
export const COMPANION_DRAW_BUDGET = 34

/** A spot made whole: where on the ground ([x, 0, z], model units) and which way it faces (radians about the upright). */
export interface Standing {
  at: [number, number, number]
  turn: number
}

/** Which way faces the landmark's middle from (x, z): its turn about the upright, 0 facing +Z. Straight on from the middle itself. */
export function turnToward(x: number, z: number, toX = 0, toZ = 0): number {
  const dx = toX - x
  const dz = toZ - z
  return Math.hypot(dx, dz) > 1e-9 ? Math.atan2(dx, dz) : 0
}

/** How much of the way from facing the front to facing the landmark the guide turns, when her spot does not say. */
const GUIDE_TURN = 0.3

/** A finite number, or `fallback`. */
const finite = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback)

/**
 * Where the guide and the visitor's character stand at the place `id`, and
 * which way each faces: its own spots where `standAt` gives them, otherwise
 * the default (`defaultStand`). The guide faces the front, turned a little
 * toward the landmark; the visitor's character faces the landmark. A spot's
 * own turn wins.
 */
export function standingFor(id: string, overrides: Partial<Record<string, Partial<Stand>>> = standAt, fallback: Stand = defaultStand): { guide: Standing; guest: Standing } {
  const own = overrides[id] ?? {}
  const whole = (spot: Spot | undefined, base: Spot, turn: (x: number, z: number) => number): Standing => {
    const x = finite(spot?.at?.[0], base.at[0])
    const z = finite(spot?.at?.[1], base.at[1])
    // A spot of its own stands on its own floor; the default stands on the ground.
    const lift = Math.max(0, finite(spot ? spot.lift : base.lift, 0))
    return { at: [x, lift, z], turn: finite(spot?.turn, finite(base.turn, turn(x, z))) }
  }
  const towardLandmark = (x: number, z: number) => turnToward(x, z)
  // From facing the front, the shorter way round toward the landmark, part of the way.
  const guideTurn = (x: number, z: number) => {
    const full = turnToward(x, z)
    return GUIDE_TURN * Math.atan2(Math.sin(full), Math.cos(full))
  }
  return {
    guide: whole(own.guide, fallback.guide, guideTurn),
    guest: whole(own.guest, fallback.guest, towardLandmark),
  }
}

/**
 * A point at a place in the world: `local` ([x, y, z], model units, in the
 * landmark's own frame) carried to where `OnGround` stands the landmark.
 */
export function worldAt(place: Place, districts: District[], local: readonly [number, number, number]): Vector3 {
  const { up, south, east } = surfaceFrame(dirOf(place.at))
  return groundOf(place.at, districts)
    .addScaledVector(east, local[0] * MODEL_SCALE)
    .addScaledVector(up, local[1] * MODEL_SCALE)
    .addScaledVector(south, local[2] * MODEL_SCALE)
}

/**
 * How far the ground at (`x`, `z`) round a place stands above (+) or below
 * (−) the landmark's own ground plane, in model units: the planet curves away
 * from the plane (about 0.035 at 0.9 from the middle), and the land rises and
 * falls a little. A character standing there is lowered or raised by as much,
 * so its feet are on the ground, not over it.
 */
export function groundUnder(place: Place, districts: District[], x: number, z: number): number {
  const p = worldAt(place, districts, [x, 0, z])
  const dir = p.clone().normalize()
  const ground = dir.clone().multiplyScalar(1 + heightAt(dir, districts))
  return ground.sub(p).dot(dirOf(place.at)) / MODEL_SCALE
}

/**
 * A standing settled onto what it stands on: the ground at its place
 * (`groundUnder`), or, for a spot on the landmark's own floor (`at[1]`, its
 * height above the landmark's ground plane: a sawdust ring, a court), that floor.
 */
export function onTheGround(place: Place, districts: District[], standing: Standing): Standing {
  const [x, lift, z] = standing.at
  return { ...standing, at: [x, lift > 0 ? lift : groundUnder(place, districts, x, z), z] }
}

/** How far over the top of the guide's head her bubble's tail points, in model units. */
const OVER_HEAD = 0.04

/** Where the guide's speech bubble points: just over her head as she stands at `place`, in the world. */
export function bubbleAnchor(place: Place, districts: District[], standing: Standing, look: Pick<Look, 'height' | 'age'>): Vector3 {
  return worldAt(place, districts, [standing.at[0], standing.at[1] + characterHeight(look) + OVER_HEAD, standing.at[2]])
}
