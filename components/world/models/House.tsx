'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Door, Extruded, Lit, Ring, Roof, Spin, Tube, Water, Window, blend, ellipseOutline, heightWithin, type Vec3 } from './kit'
import { Kitten, LargeDog, MaskCat, MediumDog, SwirlCat } from './HousePets'
import type { ModelProps } from './registry'

/**
 * The cottage: a storey and a half under a steep gabled roof, standing back
 * and to the left so its garden and pond lie in front, to the right. Its
 * walls and roof are shares of the height under the chimney, so it keeps its
 * proportions at every height it is built for.
 */
const COTTAGE = { x: -0.2, z: -0.24, width: 0.72, depth: 0.5, plinth: 0.05, overhang: 0.07, wallShare: 0.47, chimneyAbove: 0.14 }
/** The door, the front windows and the dormer, across the front from the cottage's middle. */
const DOOR = { x: 0.13, width: 0.15, height: 0.3, wallShare: 0.62 }
/** The porch's posts stand this far out from the door's sides; the lamp hangs this far from the door's middle, beyond them. */
const PORCH_POST = 0.045
const LAMP_FROM_DOOR = 0.175
const WINDOW: [number, number] = [0.13, 0.16]
/** One shuttered window at the front, left of the door: two did not fit beside the porch without burying one in the other. */
const WINDOWS_FRONT = [-0.17]
/** A window box: its height, the kit sill's height above it, and the gap between them where the flowers grow. */
const BOX = { height: 0.035, sill: 0.035, gap: 0.035 }
/** Window and door frames: slimmer than the kit's, as a cottage's are. */
const FRAME = 0.02
/** The dormer in the front slope, over the left-hand window, its top a share of the way up the roof. */
const DORMER = { x: -0.18, width: 0.2, riseShare: 0.62 }
/** The pond: round, in a stone rim, in front of the cottage to the right. */
const POND = { at: [0.46, 0, 0.36] as Vec3, radius: 0.2, rim: 0.034 }
/** The cottage is turned a little toward its garden, so it is seen three-quarters on, a gable end showing. */
const TURN = 0.38
/** The stepping stones from the door, each [x, z, turn]. The senior cat sits on the last. */
const STONES: Array<[number, number, number]> = [
  [-0.04, 0.27, 0.2],
  [0.0, 0.42, -0.25],
  [-0.03, 0.57, 0.35],
]
/** How thick the stepping stones are: the top the senior cat sits on. */
export const STONE_HEIGHT = 0.022
/** The senior cat on the last stone: her turn, and how far back of its middle she sits, so her tail lies on it in front of her paws. */
const MASK_CAT_SEAT = { turn: 0.3, back: 0.022 }

type Colours = Record<'walls' | 'roof' | 'trim' | 'door' | 'shutter' | 'stone' | 'wood' | 'leaf' | 'bloom' | 'koi' | 'koiPale' | 'rim' | 'rock' | 'pond', string>

/** A koi: a slim body and a tail fin, nose toward -Z, its back just breaking the surface. */
function Koi({ at, turn, body, fin }: { at: Vec3; turn: number; body: string; fin: string }) {
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Blob radius={0.026} squash={[0.42, 0.32, 1]} color={body} />
      <Extruded shape={[[0, 0], [0.016, 0.024], [-0.016, 0.024]]} depth={0.004} at={[0, 0.002, 0.02]} rot={[-Math.PI / 2, 0, 0]} color={fin} bevel={0.0015} outline={false} />
    </group>
  )
}

/**
 * The cottage, built round its own middle and facing +Z: plinth, cream
 * walls, a steep roof with cream gable ends and a dormer, a brick chimney
 * that is the tallest thing (`height`), a teal door under a porch, a lamp,
 * shuttered windows with flower boxes, and a window on every other face.
 * Walls, roof, door and dormer all follow the height.
 */
function Cottage({ colour, height }: { colour: Colours; height: number }) {
  const { width, depth, plinth, overhang } = COTTAGE
  const chimneyTop = height - 0.012
  const ridge = chimneyTop - COTTAGE.chimneyAbove
  const wall = (ridge - plinth) * COTTAGE.wallShare
  const eaves = plinth + wall
  const rise = ridge - eaves
  const front = depth / 2
  const door = Math.min(DOOR.height, wall * DOOR.wallShare)
  const windowY = plinth + wall * 0.52
  const dormerTop = eaves + rise * DORMER.riseShare
  const chimney: Vec3 = [width / 2 - 0.14, 0, -0.08]
  // The window's sill hangs this far below the middle of the window (the kit's sill: its height, less its overlap);
  // the window box hangs a gap below that, so the flowers stand in front of the wall between them.
  const sillBottom = -WINDOW[1] / 2 - FRAME - BOX.sill + 0.008
  const boxTop = sillBottom - BOX.gap
  return (
    <group>
      <Block size={[width + 0.06, plinth, depth + 0.06]} at={[0, plinth / 2, 0]} color={colour.stone} bevel={0.015} />
      <Block size={[width, wall + 0.02, depth]} at={[0, plinth + wall / 2 - 0.01, 0]} color={colour.walls} bevel={0.025} />
      <Roof size={[width, rise, depth]} at={[0, eaves, 0]} overhang={overhang} gable={colour.walls} color={colour.roof} />
      <Block size={[0.12, chimneyTop - eaves - rise * 0.4, 0.12]} at={[chimney[0], (chimneyTop + eaves + rise * 0.4) / 2 - 0.02, chimney[2]]} color={landmark.brick} bevel={0.015} />
      <Block size={[0.15, 0.03, 0.15]} at={[chimney[0], chimneyTop - 0.015, chimney[2]]} color={colour.trim} bevel={0.01} />

      {/* The dormer in the front slope: its own little gable roof (plain: no courses or ridge cap, too small to carry them; the cap jutted past its ends) and a window. */}
      <Block size={[DORMER.width, dormerTop - eaves, 0.3]} at={[DORMER.x, (dormerTop + eaves) / 2, front - 0.17]} color={colour.walls} bevel={0.02} />
      <Roof
        size={[0.32, 0.09, DORMER.width]}
        rot={[0, Math.PI / 2, 0]}
        at={[DORMER.x, dormerTop, front - 0.17]}
        overhang={0.025}
        fascia={0.02}
        courses={0}
        ridge={false}
        bevel={0.012}
        color={colour.roof}
      />
      <Window size={[0.08, 0.08]} at={[DORMER.x, dormerTop - 0.065, front - 0.02]} frame={colour.trim} sill={false} border={FRAME} />

      {/* The front: a teal door under a porch on two posts, a lamp, shuttered windows with flower boxes. */}
      <Door size={[DOOR.width, door]} at={[DOOR.x, plinth, front]} color={colour.door} frame={colour.trim} border={FRAME} />
      <Roof
        size={[DOOR.width + 0.13, 0.08, 0.18]}
        style="shed"
        overhang={0.02}
        fascia={0.03}
        bevel={0.012}
        courses={2}
        at={[DOOR.x, plinth + door + 0.06, front + 0.09]}
        color={colour.roof}
      />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.022, door + 0.06, 0.022]} at={[DOOR.x + s * (DOOR.width / 2 + PORCH_POST), plinth + (door + 0.06) / 2, front + 0.17]} color={colour.trim} bevel={0.006} />
      ))}
      {/* The lamp on the wall beyond the porch, clear of its post and its roof. */}
      <Block size={[0.03, 0.03, 0.04]} at={[DOOR.x + LAMP_FROM_DOOR, plinth + door * 0.75, front + 0.02]} color={colour.door} bevel={0.008} />
      <Lit size={[0.03, 0.045, 0.03]} at={[DOOR.x + LAMP_FROM_DOOR, plinth + door * 0.75 + 0.035, front + 0.03]} color={landmark.lit} />
      {WINDOWS_FRONT.map((wx) => (
        <group key={wx}>
          <Window size={WINDOW} at={[wx, windowY, front]} frame={colour.trim} border={FRAME} />
          {[-1, 1].map((s) => (
            <Block key={s} size={[0.045, WINDOW[1] + 0.04, 0.014]} at={[wx + s * (WINDOW[0] / 2 + 0.05), windowY, front + 0.01]} color={colour.shutter} bevel={0.005} />
          ))}
          {/* A window box hung under the sill (not inside it), flowers growing up in front of the wall between them. */}
          <Block size={[WINDOW[0] + 0.06, BOX.height, 0.045]} at={[wx, windowY + boxTop - BOX.height / 2, front + 0.03]} color={colour.wood} bevel={0.008} />
          {[-0.03, 0.03].map((fx, i) => (
            <Blob key={fx} radius={0.024} squash={[1.3, 0.75, 1]} at={[wx + fx, windowY + boxTop + 0.008, front + 0.03]} color={i === 1 ? colour.leaf : colour.bloom} outline={false} />
          ))}
        </group>
      ))}

      {/* The sides and the back: a window on every face, so it is a home from every side the camera circles to. */}
      <Window size={WINDOW} at={[-width / 2, windowY, 0]} rot={[0, -Math.PI / 2, 0]} frame={colour.trim} border={FRAME} />
      <Window size={WINDOW} at={[width / 2, windowY, 0]} rot={[0, Math.PI / 2, 0]} frame={colour.trim} border={FRAME} />
      <Window size={WINDOW} at={[0, windowY, -depth / 2]} rot={[0, Math.PI, 0]} frame={colour.trim} border={FRAME} />
    </group>
  )
}

/**
 * Home: the about-me place, so the warmest and most lived-in landmark. A
 * cottage with a steep roof and a dormer, a chimney, a porch over a teal
 * door, shuttered windows with flowers in their boxes, and lights on at
 * night. In front, a round pond with koi circling under lily pads, and the
 * owner's five pets about the garden (`HousePets`): the senior cat on the
 * last stepping stone, the young cat at the pond's edge watching the koi, the
 * kitten by the fence, the red merle dog standing at the fence's end, and the
 * large white dog sitting past the pond, wagging its tail.
 *
 * Three levels of detail. The main mass: the cottage and its roof. The
 * secondary forms: the plinth, the gable ends, the dormer, the chimney, the
 * porch on its posts, the door, windows on every side, shutters, window
 * boxes, a picket fence. The props: the pets, the koi, the lily pads and the
 * stones of the pond, flowers, a lamp by the door, stepping stones.
 *
 * The chimney stands at the place's height, from 1.0 to 1.6
 * (`House.heights`); the cottage's walls and roof are shares of it.
 */
export function House({ place, district }: ModelProps) {
  const colour: Colours = {
    walls: landmark.cream,
    // Slate tiles with the district's teal in them.
    roof: blend(blend(district.color, landmark.slate, 0.5), landmark.indigo, 0.3),
    trim: landmark.offWhite,
    door: blend(district.color, landmark.indigo, 0.3),
    shutter: blend(blend(district.color, landmark.slate, 0.3), landmark.indigo, 0.12),
    stone: blend(landmark.stone, landmark.slate, 0.3),
    wood: landmark.wood,
    leaf: landmark.green,
    bloom: landmark.pink,
    koi: landmark.orange,
    koiPale: landmark.offWhite,
    rim: blend(landmark.slate, landmark.stone, 0.3),
    rock: blend(landmark.slate, landmark.indigo, 0.12),
    // A garden pond's deep green, mixed into the look's water.
    pond: blend(blend(landmark.teal, landmark.green, 0.45), landmark.indigo, 0.42),
  }
  const height = heightWithin(place.height, House.heights)
  const water = 0.026
  const [seatX, seatZ] = STONES[2]

  return (
    <group>
      <group position={[COTTAGE.x, 0, COTTAGE.z]} rotation={[0, TURN, 0]}>
        <Cottage colour={colour} height={height} />
      </group>

      {/* A short picket fence to the left of the path, and stepping stones from the door. */}
      <group position={[-0.42, 0, 0.26]}>
        <Block size={[0.4, 0.018, 0.014]} at={[0, 0.06, 0]} color={colour.trim} bevel={0.005} />
        <Block size={[0.4, 0.018, 0.014]} at={[0, 0.12, 0]} color={colour.trim} bevel={0.005} />
        {[-0.18, -0.09, 0, 0.09, 0.18].map((px) => (
          <Block key={px} size={[0.026, 0.16, 0.012]} at={[px, 0.08, 0.012]} color={colour.trim} bevel={0.005} />
        ))}
      </group>
      {STONES.map(([sx, sz, r], i) => (
        <Block key={i} size={[0.1, STONE_HEIGHT, 0.08]} at={[sx, STONE_HEIGHT / 2, sz]} rot={[0, r, 0]} color={colour.stone} bevel={0.01} />
      ))}

      {/* The pond: a stone rim, still water, lily pads clear of the koi's circle, two koi, and a few stones at its edge. */}
      <group position={POND.at}>
        {/* A low kerb of stone, sunk to half its depth. */}
        <Ring radius={POND.radius + POND.rim / 2 - 0.004} thickness={POND.rim} sides={6} around={28} at={[0, water - 0.012, 0]} color={colour.rim} />
        <Water shape={ellipseOutline(POND.radius + 0.01, POND.radius + 0.01, 24)} at={[0, water, 0]} tint={colour.pond} />
        {/* The koi circle 0.06 to 0.14 out from the middle: the pads float at the middle and out by the kerb. */}
        {[
          [0, 0, 0.5, 0.03],
          [0.12, 0.12, 2.2, 0.026],
          [-0.03, -0.17, 4.1, 0.024],
        ].map(([px, pz, r, size], i) => (
          <Extruded key={i} shape={ellipseOutline(size, size, 12, 0.5)} depth={0.005} at={[px, water + 0.004, pz]} rot={[-Math.PI / 2, 0, r]} color={blend(colour.leaf, landmark.teal, 0.2)} bevel={0.002} outline={false} />
        ))}
        <Blob radius={0.012} squash={[1, 0.7, 1]} at={[0.004, water + 0.012, -0.004]} color={colour.bloom} outline={false} />
        <Spin at={[0, water, 0]} speed={0.35}>
          <Koi at={[0.11, 0, 0]} turn={0} body={colour.koi} fin={colour.koi} />
          <Koi at={[-0.07, 0, 0.05]} turn={Math.PI + 0.6} body={colour.koiPale} fin={colour.koi} />
        </Spin>
        {/* Boulders bedded round the rim, so it reads as a pond dug in a garden rather than a basin set on it. */}
        {[
          [0.21, 0.08, 0.055, 0.045],
          [0.17, -0.15, 0.045, 0.035],
          [-0.04, 0.23, 0.05, 0.035],
          [-0.215, -0.06, 0.04, 0.03],
        ].map(([px, pz, r, h], i) => (
          <Tube key={i} bottom={r} top={r * 0.6} height={h} sides={5} bevel={0.012} at={[px, -0.004, pz]} rot={[0, i * 1.7, 0]} color={colour.rock} />
        ))}
      </group>

      {/* The senior cat on the last stepping stone, greeting whoever comes up the path, turned a little to show her spotted side. */}
      <MaskCat
        at={[seatX - MASK_CAT_SEAT.back * Math.sin(MASK_CAT_SEAT.turn), STONE_HEIGHT, seatZ - MASK_CAT_SEAT.back * Math.cos(MASK_CAT_SEAT.turn)]}
        turn={MASK_CAT_SEAT.turn}
      />
      {/* The young cat on the grass at the pond's west edge, facing the koi, his right side, his swirl and his tail to the visitor. */}
      <SwirlCat at={[0.19, 0, 0.44]} turn={1.65} />
      {/* The kitten on the grass in front of the fence. */}
      <Kitten at={[-0.38, 0, 0.5]} turn={0.3} />
      {/* The medium dog standing at the fence's end; the large dog sitting past the pond, both clear of the cottage's front and its neighbours as the visitor sees them. */}
      <MediumDog at={[-0.6, 0, 0.62]} turn={0.8} />
      <LargeDog at={[0.86, 0, 0.45]} turn={-0.5} />
    </group>
  )
}

/** Its shadow covers the cottage and the garden. */
House.shadow = 0.95
/** The heights it follows: the chimney stands at the place's height, the cottage in proportion under it. */
House.heights = [1.0, 1.6] as const
