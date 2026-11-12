'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Extruded, Flag, Lit, Tube, blend, heightWithin, roundedRectOutline, stackUp, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The stepped plinth: three round stone steps, each `rise` tall, from the widest at the foot, and their sides (smooth enough at this size). */
const STEPS = { radii: [0.74, 0.62, 0.5], rise: 0.065, sides: 30 }
/** A flagpole: its radius at the foot and the top, its collar at the foot, and the gold ball on top. */
const POLE = { foot: 0.017, top: 0.011, collar: 0.034, collarHeight: 0.03, ball: 0.024 }
/**
 * The three poles on the top step, as [x, z] from its middle, and how tall
 * each stands as a share of the tallest (the one at the back): three heights,
 * so the flags step up from the front left to the back.
 */
const POLES: Array<{ at: [number, number]; share: number; speed: number }> = [
  { at: [-0.27, 0.13], share: 0.8, speed: 1.6 },
  { at: [0.02, -0.25], share: 1, speed: 1.8 },
  { at: [0.29, 0.1], share: 0.9, speed: 1.95 },
]
/** The flags: their size, and the wind's turn (they fly toward the front right, faces to the camera). */
const FLAG = { size: [0.44, 0.28] as [number, number], wind: -0.32, amount: 0.07 }
/** A blank brass plaque on the top step's face below each pole. */
const PLAQUE = { size: [0.09, 0.04] as [number, number], depth: 0.008 }
/** Two lamps set in the lowest step, lighting the flags from below at night. */
const UPLIGHTS: Array<[number, number]> = [
  [-0.42, 0.53],
  [0.44, 0.51],
]
/** Clumps of flowers round the foot of the plinth: where, how big, which colour. */
const FLOWERS: Array<{ at: [number, number]; radius: number; colour: 'pink' | 'gold' | 'coral' }> = [
  { at: [-0.78, 0.18], radius: 0.06, colour: 'pink' },
  { at: [-0.72, 0.34], radius: 0.045, colour: 'gold' },
  { at: [0.8, 0.12], radius: 0.055, colour: 'coral' },
  { at: [0.74, 0.3], radius: 0.045, colour: 'pink' },
]

/** `points` turned by `angle` about the origin. */
const turned = (points: Point2[], angle: number): Point2[] => points.map(([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)])

/** A rectangle from (x0, y0) to (x1, y1), anticlockwise. */
const rect = (x0: number, y0: number, x1: number, y1: number): Point2[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

/** A point `d` out from (cx, cy) at angle `a`. */
const polar = (a: number, d: number, cx = 0, cy = 0): Point2 => [cx + d * Math.cos(a), cy + d * Math.sin(a)]

/**
 * A band `w` wide round a circle `r` from (cx, cy), from angle `from` to `to`
 * (anticlockwise), as `pieces` convex pieces, each overlapping the next a
 * little so no seam shows.
 */
function arcBand(r: number, w: number, from: number, to: number, pieces: number, cx = 0, cy = 0): Point2[][] {
  return Array.from({ length: pieces }, (_, k) => {
    const [a, b] = [from + ((to - from) * k) / pieces, from + ((to - from) * (k + 1.06)) / pieces]
    return [polar(a, r - w / 2, cx, cy), polar(b, r - w / 2, cx, cy), polar(b, r + w / 2, cx, cy), polar(a, r + w / 2, cx, cy)]
  })
}

/** An arrowhead at angle `a` on a circle `r`, `w` wide at its foot, pointing on round the circle anticlockwise. */
const arcHead = (r: number, w: number, a: number): Point2[] => [polar(a - 0.04, r - w, 0, 0), polar(a + 0.62, r), polar(a - 0.04, r + w)]

/**
 * The emblems, one for each of the three principles (`content/principles.ts`),
 * plain shapes with no words or letters, round each flag's middle:
 * - Keep moving: an arrow pointing on, an object in motion.
 * - Nothing is sacred: two arrows chasing each other round a circle, scrap it
 *   and go round again.
 * - AI is a tool: a spanner, a tool on the belt.
 */
const ARROW: Point2[][] = [rect(-0.08, -0.024, 0.012, 0.024), [[0, -0.066], [0.085, 0], [0, 0.066]]]
const CYCLE: Point2[][] = [0, Math.PI].flatMap((start) => [...arcBand(0.052, 0.02, start + 0.35, start + 2.3, 5), arcHead(0.052, 0.034, start + 2.3)])
const SPANNER: Point2[][] = (() => {
  // A handle running up to the right, and an open jaw on its end: a ring with its mouth turned away from the handle.
  const lean = Math.PI / 4
  const jaw = polar(lean, 0.05)
  const handle = turned(rect(-0.075, -0.014, 0.03, 0.014), lean)
  const ring = arcBand(0.026, 0.022, lean + 0.75, lean + Math.PI * 2 - 0.75, 8, jaw[0], jaw[1])
  // The handle's rounded end: a half disc on its far end.
  const end = polar(lean + Math.PI, 0.075)
  const foot = Array.from({ length: 7 }, (_, k) => polar(lean + Math.PI / 2 + (k * Math.PI) / 6, 0.014, end[0], end[1]))
  return [handle, ...ring, foot]
})()
const EMBLEMS = [ARROW, CYCLE, SPANNER]

type Colours = Record<'stone' | 'step' | 'trim' | 'pole' | 'gold' | 'brass' | 'emblem' | 'leaf' | 'pink' | 'coral', string> & { flags: string[] }

/** A flagpole standing on `at`, `height` tall to its ball's top: a tapering pole, a collar at its foot, a cleat and its halyard, the gold ball. */
function Pole({ at, height, colour }: { at: Vec3; height: number; colour: Colours }) {
  const shaft = height - POLE.ball * 1.7
  return (
    <group position={at}>
      <Tube top={POLE.collar * 0.85} bottom={POLE.collar} height={POLE.collarHeight} sides={12} bevel={0.008} color={colour.trim} />
      <Tube top={POLE.top} bottom={POLE.foot} height={shaft} sides={10} bevel={0.004} color={colour.pole} />
      <Blob radius={POLE.ball} at={[0, height - POLE.ball, 0]} color={colour.gold} />
      {/* A cleat on the pole's back and the halyard running up from it. */}
      <Block size={[0.012, 0.04, 0.012]} at={[0, 0.2, -POLE.foot - 0.004]} color={colour.brass} bevel={0.003} outline={false} />
      <Tube top={0.0035} bottom={0.0035} height={shaft - 0.22} at={[0, 0.2, -POLE.foot - 0.006]} sides={6} bevel={0.001} color={colour.trim} outline={false} />
    </group>
  )
}

/**
 * Three things: how the owner works, her three principles, one flag each.
 * Three flagpoles of different heights on a small stepped stone plinth, each
 * flag a colour of its own with a plain emblem echoing its principle, waving
 * in the same wind. No words: what the principles say is in the panel.
 *
 * Three levels of detail. The main mass: the stepped plinth and the three
 * poles. The secondary forms: the steps' edges, the poles' collars and gold
 * balls, the flags. The props: the emblems, a blank brass plaque under each
 * pole, cleats and halyards, two lamps set in the lowest step to light the
 * flags at night, clumps of flowers round the foot.
 *
 * Built from the ground up: the steps stand on each other (`stackUp`) and the
 * tallest pole's ball tops out at the place's height, from 1.1 to 1.6
 * (`Flags.heights`); the other two are shares of it. The flags wave from the
 * shared clock (still under reduced motion).
 */
export function Flags({ place, district }: ModelProps) {
  // Warm limestone, a shade off white so the flags and their emblems stand out against it.
  const stone = blend(blend(landmark.stone, landmark.sand, 0.55), landmark.slate, 0.12)
  const colour: Colours = {
    stone,
    step: blend(stone, landmark.slate, 0.22),
    trim: blend(landmark.slate, landmark.indigo, 0.35),
    pole: blend(landmark.offWhite, landmark.slate, 0.25),
    gold: landmark.gold,
    brass: blend(landmark.gold, landmark.wood, 0.4),
    emblem: landmark.offWhite,
    leaf: blend(landmark.green, district.color, 0.25),
    pink: landmark.pink,
    coral: landmark.coral,
    // One flag in the district's teal, one coral, one purple: a colour each, none a flat primary.
    flags: [blend(district.color, landmark.teal, 0.4), blend(landmark.coral, landmark.red, 0.2), blend(landmark.purple, landmark.indigo, 0.12)],
  }

  const height = heightWithin(place.height, Flags.heights)
  const tops = stackUp(0, STEPS.radii.map(() => STEPS.rise))
  const deck = tops[tops.length - 1]
  const tallest = height - deck

  return (
    <group>
      {/* The stepped plinth, each step on the one below, a darker edge at each step's lip. */}
      {STEPS.radii.map((r, k) => (
        <Tube key={r} top={r} bottom={r} height={STEPS.rise + (k ? 0.004 : 0)} at={[0, tops[k] - (k ? 0.004 : 0), 0]} sides={STEPS.sides} bevel={0.018} color={k % 2 ? colour.step : colour.stone} />
      ))}

      {POLES.map(({ at: [x, z], share, speed }, k) => {
        const poleHeight = tallest * share
        const flagTop = deck + poleHeight - POLE.ball * 2.2
        return (
          <group key={k}>
            <Pole at={[x, deck - 0.004, z]} height={poleHeight + 0.004} colour={colour} />
            <Flag
              size={FLAG.size}
              at={[x + POLE.top * 0.6, flagTop, z]}
              rot={[0, FLAG.wind, 0]}
              color={colour.flags[k]}
              amount={FLAG.amount}
              speed={speed}
              emblem={{ pieces: EMBLEMS[k], color: colour.emblem }}
            />
          </group>
        )
      })}

      {/* A blank brass plaque on the top step's face for each flag, facing out from the middle toward its pole. */}
      {POLES.map(({ at: [x, z] }, k) => {
        const turn = Math.atan2(x, Math.max(z, 0.2))
        const r = STEPS.radii[2]
        return (
          <Extruded
            key={k}
            shape={roundedRectOutline(...PLAQUE.size, 0.008)}
            depth={PLAQUE.depth}
            at={[r * Math.sin(turn), deck - STEPS.rise / 2, r * Math.cos(turn) + 0.002]}
            rot={[0, turn, 0]}
            color={colour.brass}
            outline={false}
          />
        )
      })}

      {/* Two lamps set in the lowest step's top, and the flower clumps round the plinth's foot. */}
      {UPLIGHTS.map(([x, z]) => (
        <group key={x} position={[x, tops[1], z]}>
          <Tube top={0.028} bottom={0.03} height={0.016} sides={10} bevel={0.005} at={[0, -0.006, 0]} color={colour.trim} />
          <Lit size={[0.034, 0.012, 0.034]} at={[0, 0.012, 0]} color={landmark.lit} outline={false} />
        </group>
      ))}
      {FLOWERS.map(({ at: [x, z], radius, colour: bloom }, k) => (
        <group key={k} position={[x, 0, z]}>
          <Blob radius={radius} squash={[1.15, 0.7, 1]} at={[0, radius * 0.55, 0]} color={colour.leaf} />
          {[0, 2.1, 4.2].map((a) => (
            <Blob key={a} radius={radius * 0.3} at={[radius * 0.6 * Math.sin(a + k), radius * 0.95, radius * 0.6 * Math.cos(a + k)]} color={colour[bloom]} outline={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** Its shadow covers the plinth. */
Flags.shadow = 0.85
/** The heights it follows: the tallest pole takes what the steps leave, the other two shares of it. */
Flags.heights = [1.1, 1.6] as const
