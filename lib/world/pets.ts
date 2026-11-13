import type { PetId } from '@/content/pets'

/*
 * Where the owner's five pets stand in the House's garden, and the shape of
 * each that takes a press, in the House's model units (its own frame: +Z its
 * front, y up from its ground). The House model stands each pet here
 * (`House.tsx`); the world lays the pets' hit shapes over them
 * (`PetPresses.tsx`); the word bubble points just over each. Plain numbers,
 * so the e2e tests can find the pets on the screen too.
 */

type Vec3 = [number, number, number]

/** The id of a pressed pet's word bubble on the page (`PetLayer`), by which the canvas finds it. */
export const PET_BUBBLE_ID = 'pet-bubble'

/** How thick the House's stepping stones are: the top the senior cat sits on. */
export const STONE_HEIGHT = 0.022
/** The last stepping stone from the door, [x, z, turn]: the senior cat sits on it. */
export const SEAT_STONE: [number, number, number] = [-0.03, 0.57, 0.35]
/** The senior cat on that stone: her turn, and how far back of its middle she sits, so her tail lies on it in front of her paws. */
const MASK_CAT_SEAT = { turn: 0.3, back: 0.022 }

/** Where a pet stands (its feet, in the House's frame) and which way it faces (radians about the upright, from +Z). */
export interface PetSpot {
  at: Vec3
  turn: number
}

export const PET_SPOTS: Record<PetId, PetSpot> = {
  // On the last stepping stone, greeting whoever comes up the path, turned a little to show her spotted side.
  maskCat: {
    at: [SEAT_STONE[0] - MASK_CAT_SEAT.back * Math.sin(MASK_CAT_SEAT.turn), STONE_HEIGHT, SEAT_STONE[1] - MASK_CAT_SEAT.back * Math.cos(MASK_CAT_SEAT.turn)],
    turn: MASK_CAT_SEAT.turn,
  },
  // On the grass at the pond's west edge, facing the koi, his right side, his swirl and his tail to the visitor.
  swirlCat: { at: [0.19, 0, 0.44], turn: 1.65 },
  // On the grass in front of the fence.
  kitten: { at: [-0.38, 0, 0.5], turn: 0.3 },
  // Standing at the fence's end; the large dog sitting past the pond: both clear of the cottage's front and their neighbours.
  mediumDog: { at: [-0.6, 0, 0.62], turn: 0.8 },
  largeDog: { at: [0.86, 0, 0.45], turn: -0.5 },
}

/**
 * The shape round a pet that takes a press: an ellipsoid, its middle and its
 * radii across, up and through, in the pet's own frame (from its feet, facing
 * +Z). A little larger than its body, so a small animal on a phone's screen
 * is a fair target, but never reaching a neighbour (tested), and leaving out
 * the long tails that lie on the grass.
 */
export interface PetHit {
  middle: Vec3
  radii: Vec3
}

export const PET_HITS: Record<PetId, PetHit> = {
  maskCat: { middle: [0, 0.072, 0.006], radii: [0.06, 0.09, 0.062] },
  swirlCat: { middle: [0, 0.072, 0.004], radii: [0.06, 0.09, 0.058] },
  kitten: { middle: [0.006, 0.045, 0], radii: [0.05, 0.06, 0.048] },
  mediumDog: { middle: [0, 0.088, -0.006], radii: [0.068, 0.1, 0.14] },
  largeDog: { middle: [0.01, 0.13, -0.016], radii: [0.09, 0.15, 0.13] },
}

/** How far over the top of a pet's hit shape its word bubble's tail points, in model units. */
const OVER_PET = 0.03

/** The point a pet's word bubble points at: just over its head, in the House's frame. */
export function petAnchor(id: PetId): Vec3 {
  const { at } = PET_SPOTS[id]
  const { middle, radii } = PET_HITS[id]
  return [at[0], at[1] + middle[1] + radii[1] + OVER_PET, at[2]]
}

/** The middle of a pet's hit shape, in the House's frame: where to press it. */
export function petMiddle(id: PetId): Vec3 {
  const { at, turn } = PET_SPOTS[id]
  const [x, y, z] = PET_HITS[id].middle
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  return [at[0] + x * c + z * s, at[1] + y, at[2] - x * s + z * c]
}
