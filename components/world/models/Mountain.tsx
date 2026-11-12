'use client'

import { landmark } from '@/content/sky'
import {
  Blob,
  Block,
  DIE,
  Die,
  Extruded,
  Flag,
  Flame,
  Lit,
  Peak,
  Ring,
  SNOW_PEAK,
  SnowPeak,
  Spin,
  Tube,
  blend,
  heightWithin,
  pointing,
  type Point2,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/**
 * The two peaks and a low green shoulder: where each stands, its foot's
 * radius, and its height (the main one's is what the summit flag leaves; the
 * second's and the shoulder's are shares of it), the snow line and the seed
 * that crags it.
 */
export const MAIN = { at: [-0.22, -0.34] as [number, number], radius: 0.8, snow: 0.66, seed: 4, sides: 10 }
const SECOND = { at: [0.48, -0.44] as [number, number], radius: 0.56, share: 0.6, snow: 0.74, seed: 9, sides: 9 }
const SHOULDER = { at: [-0.8, -0.16] as [number, number], radius: 0.36, share: 0.25, seed: 2, sides: 8 }
/** The summit flag: its pole standing on the main peak's tip, the ball on top, the flag's size. */
const SUMMIT = { pole: 0.2, foot: 0.009, ball: 0.02, flag: [0.2, 0.12] as [number, number] }
/**
 * The ledge on the main peak's face where the die turns: how high up the
 * peak it stands (a share of its height), how far round from the front, its
 * least radius and its thickness; `clear` is the gap kept between the die,
 * as it turns, and the peak's face, `lip` how far the ledge reaches past the
 * die, and `under` the darker rock under it, `under.drop` deep, narrowing to
 * `under.share` of the ledge where it meets the face.
 */
const LEDGE = { share: 0.3, turn: 0.42, radius: 0.13, thick: 0.06, clear: 0.012, lip: 0.03, under: { drop: 0.08, share: 0.35 } }
/** The die's radius, to its corners: what it sweeps as it turns. */
export const DIE_RADIUS = 0.1
/** The tent at the foot, front left: where, its turn, its width, depth and ridge height. */
const TENT = { at: [-0.56, 0.58] as [number, number], turn: 0.55, width: 0.32, depth: 0.36, ridge: 0.23 }
/** The campfire in front of the tent: its middle, the stones' ring, the flame. */
const FIRE = { at: [-0.3, 0.74] as [number, number], ring: 0.07, stone: 0.022, flame: { radius: 0.035, height: 0.1 } }
/** The stage at the foot, front right: where, its turn, its deck, the frame over it and the lamps hung on it. */
const STAGE = { at: [0.52, 0.5] as [number, number], turn: -0.5, deck: [0.54, 0.08, 0.34] as Vec3, frame: 0.44, post: 0.026 }
/** Pines at the foot: where, and how tall. */
const PINES: Array<{ at: [number, number]; height: number }> = [
  { at: [0.98, -0.08], height: 0.36 },
  { at: [0.9, 0.14], height: 0.28 },
  { at: [-0.95, 0.3], height: 0.3 },
]
/** Boulders at the foot. */
const BOULDERS: Array<{ at: [number, number]; radius: number }> = [
  { at: [0.05, 0.5], radius: 0.05 },
  { at: [-0.1, 0.62], radius: 0.035 },
  { at: [0.2, 0.22], radius: 0.06 },
]

type Colours = Record<
  'rock' | 'rockDeep' | 'rockUnder' | 'snow' | 'grass' | 'pine' | 'trunk' | 'stone' | 'flag' | 'pole' | 'gold' | 'die' | 'tent' | 'tentDeep' | 'wood' | 'deck' | 'frame' | 'dark' | 'drum' | 'metal',
  string
> & { lamps: string[] }

/** A pine standing on `at`, `height` tall: a short trunk and two tiers of needles. */
function Pine({ at, height, colour }: { at: Vec3; height: number; colour: Colours }) {
  const trunk = height * 0.18
  return (
    <group position={at}>
      <Tube top={0.016} bottom={0.022} height={trunk + 0.02} sides={7} bevel={0.005} color={colour.trunk} />
      <Peak radius={height * 0.3} height={height * 0.55} at={[0, trunk, 0]} sides={7} bevel={0.01} color={colour.pine} />
      <Peak radius={height * 0.22} height={height * 0.5} at={[0, trunk + height * 0.32, 0]} sides={7} bevel={0.008} color={colour.pine} />
    </group>
  )
}

/**
 * The tent, a ridge tent standing on its foot with its door to the front: its
 * canvas, the dark doorway with a flap folded back, the ridge pole's ends, and
 * a guy rope from each end to a peg.
 */
function Tent({ colour }: { colour: Colours }) {
  const { width, depth, ridge } = TENT
  const canvas: Point2[] = [[-width / 2, 0], [width / 2, 0], [0, ridge]]
  const door: Point2[] = [[-width * 0.2, 0], [width * 0.2, 0], [0, ridge * 0.66]]
  const flap: Point2[] = [[0, 0], [width * 0.2, 0], [0, ridge * 0.66]]
  return (
    <group position={[TENT.at[0], 0, TENT.at[1]]} rotation={[0, TENT.turn, 0]}>
      <Block size={[width + 0.08, 0.012, depth + 0.08]} at={[0, 0.006, 0]} color={colour.tentDeep} bevel={0.004} outline={false} />
      <Extruded shape={canvas} depth={depth} at={[0, 0.01, 0]} color={colour.tent} bevel={0.01} />
      <Extruded shape={door} depth={0.006} at={[0, 0.01, depth / 2 + 0.002]} color={colour.dark} bevel={0.002} outline={false} />
      <Extruded shape={flap} depth={0.008} at={[width * 0.2, 0.01, depth / 2 + 0.02]} rot={[0, -0.7, 0]} color={colour.tentDeep} bevel={0.002} />
      {[-1, 1].map((s) => {
        const end: Vec3 = [0, ridge + 0.03, s * (depth / 2 + 0.03)]
        const rope = pointing(end, [0, 0, s * (depth / 2 + 0.17)])
        return (
          <group key={s}>
            <Tube top={0.008} bottom={0.008} height={ridge + 0.05} at={[0, 0, s * (depth / 2 + 0.02)]} sides={6} bevel={0.002} color={colour.wood} />
            <Tube top={0.003} bottom={0.003} height={rope.length} at={rope.at} rot={rope.rot} sides={5} bevel={0.001} color={colour.frame} outline={false} />
            <Block size={[0.014, 0.03, 0.014]} at={[0, 0.012, s * (depth / 2 + 0.17)]} color={colour.wood} bevel={0.003} outline={false} />
          </group>
        )
      })}
    </group>
  )
}

/** The campfire: a ring of stones, two crossed logs and a small flame, breathing. */
function Campfire({ colour }: { colour: Colours }) {
  return (
    <group position={[FIRE.at[0], 0, FIRE.at[1]]}>
      {Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2
        return <Blob key={k} radius={FIRE.stone} squash={[1, 0.7, 1]} at={[FIRE.ring * Math.sin(a), FIRE.stone * 0.6, FIRE.ring * Math.cos(a)]} color={colour.stone} />
      })}
      {[-0.6, 0.6].map((turn) => (
        <Tube key={turn} top={0.012} bottom={0.012} height={0.11} at={[0, 0.014, 0]} rot={[Math.PI / 2, turn, 0]} sides={7} bevel={0.004} color={colour.trunk} />
      ))}
      <Flame radius={FIRE.flame.radius} height={FIRE.flame.height} at={[0, 0.024, 0]} color={landmark.orange} core={landmark.gold} />
    </group>
  )
}

/**
 * The concert stage, empty and waiting: a wooden deck on a dark skirt, a
 * frame over it with three steady coloured lamps hung from its beam (lit at
 * every hour, never chasing or blinking), a drum kit, a microphone on its
 * stand at the front, an amp, and a speaker either side.
 */
function Stage({ colour }: { colour: Colours }) {
  const [w, h, d] = STAGE.deck
  const top = h
  const back = -d / 2 + 0.03
  const frameTop = top + STAGE.frame
  return (
    <group position={[STAGE.at[0], 0, STAGE.at[1]]} rotation={[0, STAGE.turn, 0]}>
      <Block size={[w, h - 0.02, d]} at={[0, (h - 0.02) / 2, 0]} color={colour.frame} bevel={0.01} />
      <Block size={[w + 0.02, 0.024, d + 0.02]} at={[0, h - 0.012, 0]} color={colour.deck} bevel={0.008} />
      {/* Two steps up at the front right. */}
      {[0, 1].map((k) => (
        <Block key={k} size={[0.12, 0.03 * (k + 1), 0.05]} at={[w / 2 - 0.08, 0.015 * (k + 1), d / 2 + 0.06 - k * 0.04]} color={colour.deck} bevel={0.006} />
      ))}
      {/* The frame: two posts at the back and the beam across them. */}
      {[-1, 1].map((s) => (
        <Block key={s} size={[STAGE.post, STAGE.frame, STAGE.post]} at={[s * (w / 2 - 0.03), top + STAGE.frame / 2, back]} color={colour.frame} bevel={0.006} />
      ))}
      <Block size={[w - 0.02, 0.034, 0.034]} at={[0, frameTop, back]} color={colour.frame} bevel={0.008} />
      {/* The lamps: cans hung from the beam, each tipped toward the stage, its lens lit. */}
      {colour.lamps.map((lamp, k) => {
        const x = (k - 1) * 0.15
        return (
          <group key={k} position={[x, frameTop - 0.03, back + 0.02]} rotation={[0.7, 0, 0]}>
            <Tube top={0.03} bottom={0.025} height={0.06} at={[0, -0.03, 0]} rot={[Math.PI / 2, 0, 0]} sides={10} bevel={0.005} color={colour.dark} />
            <Lit size={[0.044, 0.044, 0.01]} at={[0, 0, 0.034]} color={lamp} day={lamp} always outline={false} />
          </group>
        )
      })}
      {/* The drum kit at the back: a bass drum on its side, a tom on it, a cymbal on a stand. */}
      <group position={[-0.08, top, back + 0.09]}>
        <Tube top={0.055} bottom={0.055} height={0.05} at={[0, 0.056, -0.025]} rot={[Math.PI / 2, 0, 0]} sides={14} bevel={0.008} color={colour.drum} />
        <Ring radius={0.05} thickness={0.008} sides={5} around={14} at={[0, 0.056, 0.027]} rot={[Math.PI / 2, 0, 0]} color={colour.gold} outline={false} />
        <Tube top={0.032} bottom={0.032} height={0.035} at={[0.07, 0.07, 0.02]} sides={12} bevel={0.006} color={colour.drum} />
        <Tube top={0.004} bottom={0.004} height={0.16} at={[-0.08, 0, 0.02]} sides={5} bevel={0.001} color={colour.metal} outline={false} />
        <Tube top={0.004} bottom={0.045} height={0.008} at={[-0.08, 0.16, 0.02]} rot={[0.15, 0, 0]} sides={14} bevel={0.002} color={colour.gold} />
      </group>
      {/* The amp beside the drums, and the microphone at the front. */}
      <Block size={[0.1, 0.09, 0.05]} at={[0.15, top + 0.045, back + 0.06]} color={colour.dark} bevel={0.008} />
      <Block size={[0.08, 0.05, 0.004]} at={[0.15, top + 0.045, back + 0.087]} color={colour.metal} bevel={0.002} outline={false} />
      <Tube top={0.016} bottom={0.022} height={0.008} at={[0.02, top, d / 2 - 0.07]} sides={10} bevel={0.002} color={colour.metal} />
      <Tube top={0.004} bottom={0.004} height={0.17} at={[0.02, top, d / 2 - 0.07]} sides={5} bevel={0.001} color={colour.metal} outline={false} />
      <Blob radius={0.014} at={[0.02, top + 0.18, d / 2 - 0.07]} color={colour.dark} />
      {/* A speaker either side, on the ground, each a box with two cones. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 + 0.07), 0, 0.02]} rotation={[0, -s * 0.25, 0]}>
          <Block size={[0.1, 0.22, 0.09]} at={[0, 0.11, 0]} color={colour.dark} bevel={0.01} />
          {[0.07, 0.16].map((y, k) => (
            <Ring key={y} radius={k ? 0.02 : 0.03} thickness={0.008} sides={5} around={14} at={[0, y, 0.046]} rot={[Math.PI / 2, 0, 0]} color={colour.metal} outline={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

/**
 * Off the clock: everything the owner does away from a screen
 * (`content/interests.ts`), gathered on one mountain. A snow-capped peak with
 * a flag on its summit (the outdoors: hiking), a second lower peak and a green
 * shoulder, and three small scenes, each clear from the place camera: a
 * twenty-sided die turning slowly on a ledge of the peak (board games and
 * D&D), a ridge tent with a campfire at its foot (camping), and an empty
 * concert stage with steady coloured lamps (concerts). The peaks carry the
 * silhouette; the scenes sit low, at the foot and on the ledge.
 *
 * Three levels of detail. The main mass: the two snow-capped peaks and the
 * shoulder. The secondary forms: the ledge, the tent, the stage and its
 * frame, the pines. The props: the summit flag, the die, the campfire, the
 * tent's ropes and pegs, the drums, the microphone, the amp and the speakers,
 * the boulders.
 *
 * Built from the ground up: the summit flag's ball tops out at the place's
 * height, from 1.6 to 2.2 (`Mountain.heights`); the main peak takes what the
 * pole leaves, the second peak, the shoulder and the ledge shares of it. The
 * die turns, the flag waves and the fire breathes, slowly (still under
 * reduced motion).
 */
export function Mountain({ place, district }: ModelProps) {
  const rock = blend(landmark.slate, landmark.stone, 0.3)
  const colour: Colours = {
    rock,
    rockDeep: blend(rock, landmark.indigo, 0.14),
    // The ledge's underside, in its own shade, so the ledge reads as a shelf of rock.
    rockUnder: blend(rock, landmark.indigo, 0.38),
    snow: landmark.offWhite,
    grass: blend(landmark.green, district.color, 0.2),
    pine: blend(landmark.green, landmark.indigo, 0.3),
    trunk: blend(landmark.wood, landmark.indigo, 0.35),
    stone: blend(landmark.stone, landmark.slate, 0.4),
    flag: blend(landmark.coral, landmark.red, 0.15),
    pole: blend(landmark.slate, landmark.indigo, 0.3),
    gold: landmark.gold,
    die: blend(landmark.purple, landmark.pink, 0.15),
    tent: blend(landmark.orange, landmark.gold, 0.25),
    tentDeep: blend(landmark.orange, landmark.wood, 0.45),
    wood: landmark.wood,
    deck: blend(landmark.wood, landmark.indigo, 0.18),
    frame: blend(landmark.indigo, landmark.slate, 0.25),
    dark: blend(landmark.indigo, landmark.purple, 0.15),
    drum: blend(landmark.red, landmark.coral, 0.3),
    metal: blend(landmark.slate, landmark.offWhite, 0.25),
    // Three steady lamps: the district's teal, pink and gold.
    lamps: [district.color, landmark.pink, landmark.gold],
  }

  const height = heightWithin(place.height, Mountain.heights)
  const peak = height - SUMMIT.pole - SUMMIT.ball * 2
  const second = peak * SECOND.share
  const shoulder = peak * SHOULDER.share
  // The main peak's true cone (its corners never stand outside it): how far its face stands from its axis at `y`.
  const cone = (y: number) => MAIN.radius * Math.pow(Math.max(0, 1 - y / peak), SNOW_PEAK.curve)
  // The ledge stands on the main peak's face, turned a little round from the front. The die stands far enough out that,
  // turning, it clears the cone at every height it spans (at each, the cone's face plus the die's reach there), and the
  // ledge reaches from inside the rock to a lip past the die.
  const ledgeY = peak * LEDGE.share
  const ledgeTop = ledgeY + LEDGE.thick
  const dieTall = 2 * DIE.inradius * DIE_RADIUS
  const dieMid = ledgeTop + dieTall / 2
  let dieOut = 0
  for (let k = 0; k <= 16; k++) {
    const y = ledgeTop + (dieTall * k) / 16
    dieOut = Math.max(dieOut, cone(y) + Math.sqrt(Math.max(0, DIE_RADIUS ** 2 - (y - dieMid) ** 2)))
  }
  dieOut += LEDGE.clear
  const ledgeRadius = Math.max(LEDGE.radius, (dieOut + DIE_RADIUS + LEDGE.lip - (cone(ledgeY) - 0.04)) / 2)
  const ledgeOut = dieOut + DIE_RADIUS + LEDGE.lip - ledgeRadius
  const along = (out: number, y: number): Vec3 => [MAIN.at[0] + out * Math.sin(LEDGE.turn), y, MAIN.at[1] + out * Math.cos(LEDGE.turn)]
  const ledge = along(ledgeOut, ledgeY)
  const die = along(dieOut, ledgeTop)
  // The summit pole is set into the tip where the cone is wider than the pole's foot, so it never stands on a point.
  const poleSink = peak * Math.pow((SUMMIT.foot * 1.5) / MAIN.radius, 1 / SNOW_PEAK.curve)

  return (
    <group>
      {/* The peaks and the shoulder. */}
      <group name="main-peak">
        <SnowPeak radius={MAIN.radius} height={peak} snow={MAIN.snow} seed={MAIN.seed} sides={MAIN.sides} at={[MAIN.at[0], 0, MAIN.at[1]]} color={colour.rock} cap={colour.snow} />
      </group>
      <SnowPeak radius={SECOND.radius} height={second} snow={SECOND.snow} seed={SECOND.seed} sides={SECOND.sides} at={[SECOND.at[0], 0, SECOND.at[1]]} color={colour.rockDeep} cap={colour.snow} />
      <SnowPeak radius={SHOULDER.radius} height={shoulder} snow={1} seed={SHOULDER.seed} sides={SHOULDER.sides} at={[SHOULDER.at[0], 0, SHOULDER.at[1]]} color={colour.grass} cap={colour.grass} />

      {/* The summit flag on the main peak's tip. */}
      <group position={[MAIN.at[0], peak - poleSink, MAIN.at[1]]} name="summit-pole">
        <Tube top={0.007} bottom={SUMMIT.foot} height={SUMMIT.pole + poleSink} sides={8} bevel={0.003} color={colour.pole} />
        <Blob radius={SUMMIT.ball} at={[0, SUMMIT.pole + poleSink + SUMMIT.ball * 0.8, 0]} color={colour.gold} />
        <Flag size={SUMMIT.flag} at={[0.006, SUMMIT.pole + poleSink - 0.01, 0]} rot={[0, -0.4, 0]} color={colour.flag} speed={1.7} />
      </group>

      {/* The ledge on the peak's face, darker rock under it narrowing into the face, and the die turning slowly on it. */}
      <Tube top={ledgeRadius} bottom={ledgeRadius * 0.85} height={LEDGE.thick} at={ledge} sides={7} bevel={0.012} color={colour.rockDeep} />
      <Tube
        top={ledgeRadius * 0.85}
        bottom={ledgeRadius * LEDGE.under.share}
        height={LEDGE.under.drop}
        at={along(ledgeOut - ledgeRadius * (1 - LEDGE.under.share) * 0.6, ledgeY - LEDGE.under.drop + 0.004)}
        sides={7}
        bevel={0.01}
        color={colour.rockUnder}
      />
      <Spin at={die} speed={0.35}>
        <Die radius={DIE_RADIUS} color={colour.die} />
      </Spin>

      {/* The camp at the foot: the tent and its fire. */}
      <Tent colour={colour} />
      <Campfire colour={colour} />

      {/* The stage at the foot. */}
      <Stage colour={colour} />

      {/* Pines and boulders round the foot. */}
      {PINES.map(({ at: [x, z], height: h }) => (
        <Pine key={x} at={[x, 0, z]} height={h} colour={colour} />
      ))}
      {BOULDERS.map(({ at: [x, z], radius }) => (
        <Blob key={x} radius={radius} squash={[1.2, 0.75, 1]} at={[x, radius * 0.7, z]} color={colour.stone} />
      ))}
    </group>
  )
}

/** Its shadow covers the peaks' feet. */
Mountain.shadow = 1.05
/** The heights it follows: the main peak takes what the summit flag leaves, the rest shares of it. */
Mountain.heights = [1.6, 2.2] as const
