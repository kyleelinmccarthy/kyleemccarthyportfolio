'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Door, Flag, Glass, Lit, Peak, StreetLamp, Tube, blend, heightWithin, stackUp, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The paved plaza the three towers share. */
const PLAZA = { width: 1.7, depth: 1.5, height: 0.05 }
/** Street trees on the plaza: a trunk and a round canopy. The front one stands off to the right, clear of the middle tower's door. */
const TREES: Vec3[] = [
  [0.7, 0, 0.6],
  [-0.66, 0, -0.42],
]
/**
 * An office tower's storeys: a tall glazed lobby, then floors `pitch` apart,
 * each with a band of glass `band` high between solid corner piers `pier`
 * wide; `fins` slim mullions run up every face over the bands.
 */
const FLOOR = { lobby: 0.25, pitch: 0.17, band: 0.1, pier: 0.05, fins: 3, top: 0.04 }
/** The plinth course a tower stands on and the cornice that caps it. */
const PLINTH = { height: 0.05, reach: 0.015 }
const CORNICE = { height: 0.035, reach: 0.022 }
/**
 * The three towers, set out on the plaza: the tallest at the back in the
 * middle, a middle one to the right, a low one at the front left. The two
 * shorter ones are a share of the tallest one's height.
 */
const TOWERS = {
  tall: { x: -0.15, z: -0.36, width: 0.52, depth: 0.52 },
  mid: { x: 0.46, z: 0.0, width: 0.44, depth: 0.48, share: 0.64 },
  low: { x: -0.6, z: 0.32, width: 0.38, depth: 0.36, share: 0.44 },
}
/** The tallest tower's roof, from its parapet up: a plant room, a mast and the warning lamp at its tip. */
const ROOFTOP = { parapet: 0.05, plantRoom: 0.16, mast: 0.3, lamp: 0.04 }
/** The glazed bridge between the tallest and the middle tower, a share of the way up the middle one. */
const BRIDGE = { share: 0.62, height: 0.1, depth: 0.12 }
/** The street lamps either side of the way in: where they stand, and how tall. */
const LAMPS: Vec3[] = [
  [-0.32, 0, 0.32],
  [0.1, 0, 0.42],
]
const LAMP = { height: 0.31, lantern: 0.036 }
/** The cooling unit on the tallest tower's roof, in front of the plant room and clear of it. */
const ROOF_UNIT: Vec3 = [0.15, 0, 0.16]
/** The water tank's sides: enough to read round at its size on a roof. */
const TANK_SIDES = 10

type Colours = Record<'tall' | 'mid' | 'low' | 'trim' | 'metal' | 'paving' | 'wood' | 'green' | 'door' | 'flag', string>

interface TowerShape {
  /** Where its base centre stands. */
  at: Vec3
  width: number
  depth: number
  /** From its foot to the top of its cornice. */
  height: number
  walls: string
  colour: Colours
  /** A door in the middle of its front. */
  door?: boolean
}

/** The faces of a box `width` by `depth`: each one's turn, how far out it stands from the middle, and how wide it is. */
function facesOf(width: number, depth: number): Array<{ turn: number; out: number; span: number }> {
  return [0, 1, 2, 3].map((k) => ({ turn: (k * Math.PI) / 2, out: k % 2 === 0 ? depth / 2 : width / 2, span: k % 2 === 0 ? width : depth }))
}

/**
 * One face's glazing, set on the wall at `out` from the tower's middle: the
 * lobby's tall glass, a band of glass on every floor, and the fins that run up
 * over them.
 */
function Glazing({ out, span, from, floors, pitch, to, fins }: { out: number; span: number; from: number; floors: number; pitch: number; to: number; fins: string }) {
  const pane = span - 2 * FLOOR.pier
  return (
    <group>
      {/* The panes draw no line of their own: the piers and the white fins already frame them. */}
      <Glass size={[pane, FLOOR.lobby * 0.66, 0.02]} at={[0, from - FLOOR.lobby * 0.5, out + 0.004]} outline={false} />
      {Array.from({ length: floors }, (_, k) => (
        <Glass key={k} size={[pane, FLOOR.band, 0.02]} at={[0, from + pitch * (k + 0.5), out + 0.004]} outline={false} />
      ))}
      {Array.from({ length: FLOOR.fins }, (_, k) => (
        <Block
          key={k}
          size={[0.018, to - from, 0.03]}
          at={[pane * ((k + 1) / (FLOOR.fins + 1) - 0.5), (from + to) / 2, out + 0.012]}
          color={fins}
          bevel={0.006}
          outline={false}
        />
      ))}
    </group>
  )
}

/**
 * An office tower: a plinth course, the walls, the glazed lobby, a band of
 * glass on every floor between corner piers with fins up every face, and a
 * cornice. Its floors fill whatever height it is given.
 */
function OfficeTower({ at, width, depth, height, walls, colour, door = false }: TowerShape) {
  const body = height - CORNICE.height
  const from = FLOOR.lobby
  const to = body - FLOOR.top
  const floors = Math.max(1, Math.floor((to - from) / FLOOR.pitch))
  const pitch = (to - from) / floors
  return (
    <group position={at}>
      <Block size={[width + 2 * PLINTH.reach, PLINTH.height, depth + 2 * PLINTH.reach]} at={[0, PLINTH.height / 2, 0]} color={colour.trim} bevel={0.014} />
      <Block size={[width, body, depth]} at={[0, body / 2, 0]} color={walls} bevel={0.022} />
      <Block size={[width + 2 * CORNICE.reach, CORNICE.height, depth + 2 * CORNICE.reach]} at={[0, body + CORNICE.height / 2 - 0.004, 0]} color={colour.trim} bevel={0.012} />
      {facesOf(width, depth).map(({ turn, out, span }) => (
        <group key={turn} rotation={[0, turn, 0]}>
          <Glazing out={out} span={span} from={from} floors={floors} pitch={pitch} to={to} fins={colour.trim} />
        </group>
      ))}
      {door && <Door size={[0.12, 0.19]} at={[0, 0, depth / 2]} color={colour.door} frame={colour.trim} step={colour.paving} />}
    </group>
  )
}

/** A water tank on four legs under a conical lid, as on an old city roof. */
function WaterTank({ at, colour }: { at: Vec3; colour: Colours }) {
  const legs = 0.07
  const drum = 0.13
  const radius = 0.075
  return (
    <group position={at}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <Block key={`${sx}${sz}`} size={[0.016, legs + 0.01, 0.016]} at={[sx * 0.045, legs / 2, sz * 0.045]} color={colour.metal} bevel={0.005} />),
      )}
      <Tube top={radius} bottom={radius} height={drum} at={[0, legs, 0]} sides={TANK_SIDES} bevel={0.012} color={colour.wood} />
      <Peak radius={radius + 0.012} height={0.055} at={[0, legs + drum - 0.004, 0]} sides={TANK_SIDES} bevel={0.01} color={colour.metal} />
    </group>
  )
}

/** An air-conditioning unit: a box with a round fan grille on top. */
function CoolingUnit({ at, colour }: { at: Vec3; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.13, 0.07, 0.1]} at={[0, 0.035, 0]} color={colour.trim} bevel={0.012} />
      <Tube top={0.034} bottom={0.036} height={0.014} at={[0, 0.068, 0]} sides={8} bevel={0.005} color={colour.metal} />
    </group>
  )
}

/** A square planter with a clipped shrub. */
function Planter({ at, colour }: { at: Vec3; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.11, 0.07, 0.11]} at={[0, 0.035, 0]} color={colour.trim} bevel={0.012} />
      {/* A small clipped shrub, its planter's line enough to frame it. */}
      <Blob radius={0.065} squash={[1, 0.85, 1]} at={[0, 0.11, 0]} color={colour.green} outline={false} />
    </group>
  )
}

/**
 * 403HQ. It is a client portal, the office its clients come to, so its
 * landmark is a small business quarter: three office towers of different
 * heights on a shared plaza, joined by a glazed bridge, with plant on their
 * roofs and a mast on the tallest.
 *
 * Three levels of detail. The main mass: the plaza and the three towers. The
 * secondary forms: plinth courses and cornices, glazed lobbies and doors, a
 * band of glass on every floor between corner piers, fins up every face, the
 * bridge, the parapet and the plant room. The props: cooling units and a water
 * tank on the roofs, a roof terrace with shrubs, the mast and its warning
 * lamp, street lamps, planters, a bench and a flag on the plaza.
 *
 * Built from the ground up (`stackUp`): the tallest tower takes what the
 * place's height leaves under its roof, so the mast's lamp tops out at the
 * place's height, from 1.9 to 2.6 (`Towers.heights`); the other two follow it.
 */
export function Towers({ place, district }: ModelProps) {
  const colour: Colours = {
    // The district's blue lifted toward the palette's sky: a clear mid blue (white lifted it to lavender), the glass bands and white fins reading on it.
    tall: blend(district.color, landmark.sky, 0.45),
    mid: blend(landmark.sand, landmark.cream, 0.35),
    // Deep blue, the district's own deepened toward indigo, its white fins standing out.
    low: blend(district.color, landmark.indigo, 0.28),
    trim: landmark.offWhite,
    metal: blend(landmark.slate, landmark.indigo, 0.35),
    // Warm paving a shade deeper than the white trim, so the plinths and kerbs read against it.
    paving: blend(blend(landmark.stone, landmark.sand, 0.45), landmark.slate, 0.4),
    wood: landmark.wood,
    green: landmark.green,
    door: blend(district.color, landmark.indigo, 0.45),
    flag: district.color,
  }

  const height = heightWithin(place.height, Towers.heights)
  const base = PLAZA.height
  const above = [ROOFTOP.parapet, ROOFTOP.plantRoom, ROOFTOP.mast, ROOFTOP.lamp]
  const tallHeight = height - base - above.reduce((sum, h) => sum + h, 0)
  const [, roofY, plantY, mastY, lampY] = stackUp(base, [tallHeight, ...above])
  const midHeight = tallHeight * TOWERS.mid.share
  const lowHeight = tallHeight * TOWERS.low.share
  const { tall, mid, low } = TOWERS

  // The bridge spans the gap between the tallest tower's right face and the middle tower's left, where the two overlap front to back.
  const bridgeFrom = tall.x + tall.width / 2 - 0.02
  const bridgeTo = mid.x - mid.width / 2 + 0.02
  const bridgeZ = (Math.max(tall.z - tall.depth / 2, mid.z - mid.depth / 2) + Math.min(tall.z + tall.depth / 2, mid.z + mid.depth / 2)) / 2
  const bridgeY = base + midHeight * BRIDGE.share

  return (
    <group>
      {/* The plaza, with a kerb of paving round it. */}
      <Block size={[PLAZA.width, PLAZA.height, PLAZA.depth]} at={[0, PLAZA.height / 2, 0]} color={colour.paving} bevel={0.02} />

      <OfficeTower at={[tall.x, base, tall.z]} width={tall.width} depth={tall.depth} height={tallHeight} walls={colour.tall} colour={colour} door />
      <OfficeTower at={[mid.x, base, mid.z]} width={mid.width} depth={mid.depth} height={midHeight} walls={colour.mid} colour={colour} door />
      <OfficeTower at={[low.x, base, low.z]} width={low.width} depth={low.depth} height={lowHeight} walls={colour.low} colour={colour} door />

      {/* The glazed bridge between the tallest and the middle tower. */}
      <group position={[(bridgeFrom + bridgeTo) / 2, bridgeY, bridgeZ]}>
        <Block size={[bridgeTo - bridgeFrom, BRIDGE.height, BRIDGE.depth]} color={colour.trim} bevel={0.012} />
        {[-1, 1].map((s) => (
          <Glass key={s} size={[bridgeTo - bridgeFrom - 0.05, BRIDGE.height * 0.6, 0.02]} at={[0, 0, s * (BRIDGE.depth / 2)]} outline={false} />
        ))}
      </group>

      {/* The tallest tower's roof: a parapet, a plant room with a louvred band, and the mast with its warning lamp. */}
      <group position={[tall.x, 0, tall.z]}>
        <Block size={[tall.width - 0.03, ROOFTOP.parapet + 0.01, tall.depth - 0.03]} at={[0, roofY + ROOFTOP.parapet / 2 - 0.005, 0]} color={colour.tall} bevel={0.014} />
        <Block size={[tall.width * 0.58, ROOFTOP.plantRoom + 0.01, tall.depth * 0.5]} at={[-0.04, plantY + ROOFTOP.plantRoom / 2 - 0.005, -0.04]} color={colour.trim} bevel={0.016} />
        <Block size={[tall.width * 0.58 + 0.006, 0.04, tall.depth * 0.5 + 0.006]} at={[-0.04, plantY + ROOFTOP.plantRoom * 0.6, -0.04]} color={colour.metal} bevel={0.008} outline={false} />
        <Tube top={0.008} bottom={0.016} height={ROOFTOP.mast + 0.01} at={[-0.04, mastY - 0.01, -0.04]} sides={8} bevel={0.004} color={colour.metal} />
        <Block size={[0.07, 0.01, 0.01]} at={[-0.04, mastY + ROOFTOP.mast * 0.55, -0.04]} color={colour.metal} bevel={0.003} outline={false} />
        <Lit size={[0.028, ROOFTOP.lamp, 0.028]} at={[-0.04, lampY + ROOFTOP.lamp / 2, -0.04]} color={landmark.red} />
        <CoolingUnit at={[ROOF_UNIT[0], plantY, ROOF_UNIT[2]]} colour={colour} />
      </group>

      {/* The middle tower's roof: cooling units and a water tank. */}
      <group position={[mid.x, base + midHeight, mid.z]}>
        <CoolingUnit at={[-0.1, -0.004, 0.1]} colour={colour} />
        <CoolingUnit at={[0.08, -0.004, 0.12]} colour={colour} />
        <WaterTank at={[0.06, -0.004, -0.1]} colour={colour} />
      </group>

      {/* The low tower's roof terrace: planters, a skylight. */}
      <group position={[low.x, base + lowHeight, low.z]}>
        <Planter at={[-0.09, -0.004, 0.08]} colour={colour} />
        <Planter at={[0.09, -0.004, -0.08]} colour={colour} />
        <Glass size={[0.12, 0.04, 0.1]} at={[0.06, 0.014, 0.08]} outline={false} />
      </group>

      {/* The plaza: lamps either side of the way in, planters, a bench and a flag. */}
      {LAMPS.map(([x, , z]) => (
        <StreetLamp key={x} at={[x, base, z]} height={LAMP.height} lantern={LAMP.lantern} color={colour.metal} />
      ))}
      <Planter at={[-0.12, base, 0.62]} colour={colour} />
      {TREES.map(([x, , z]) => (
        <group key={x} position={[x, base, z]}>
          {/* A slim trunk under its canopy: no line of its own. */}
          <Tube top={0.014} bottom={0.02} height={0.2} sides={8} bevel={0.005} color={colour.wood} outline={false} />
          <Blob radius={0.09} squash={[1, 1.15, 1]} at={[0, 0.27, 0]} color={colour.green} />
        </group>
      ))}
      <group position={[0.15, base, 0.66]}>
        <Block size={[0.22, 0.022, 0.07]} at={[0, 0.07, 0]} color={colour.wood} bevel={0.008} />
        {[-0.08, 0.08].map((x) => (
          <Block key={x} size={[0.02, 0.07, 0.06]} at={[x, 0.035, 0]} color={colour.metal} bevel={0.006} outline={false} />
        ))}
      </group>
      <Tube top={0.007} bottom={0.009} height={0.55} at={[0.76, base, 0.3]} sides={8} bevel={0.003} color={colour.metal} />
      <Blob radius={0.014} at={[0.76, base + 0.56, 0.3]} color={landmark.gold} />
      <Flag size={[0.16, 0.1]} at={[0.767, base + 0.54, 0.3]} rot={[0, -0.4, 0]} color={colour.flag} />
    </group>
  )
}

/** Its shadow covers the plaza. */
Towers.shadow = 1.15
/** The heights it follows: the tallest tower takes up the difference, the others follow it. */
Towers.heights = [1.9, 2.6] as const
