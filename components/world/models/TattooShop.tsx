'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Door, Extruded, Flame, Lit, StreetLamp, Tube, Turned, Window, blend, flameOutline, heightWithin, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'
import { CORNICE, ShopShell, groundTopOf, type Parapet, type Storey } from './shopfront'

/** The pavement the shop stands on. */
const PAVING = { width: 1.7, depth: 1.4, z: 0.06, height: 0.04 }
/** The shop: its width, depth and where its middle stands; the plinth course round its foot. */
const BUILDING = { width: 1.2, depth: 0.8, z: -0.2, plinth: 0.07 }
/** The ground floor's share of the walls, never less than `least` (the shopfront needs it); the band between the storeys. */
const STOREY: Storey = { share: 0.5, least: 0.62, band: 0.035 }
/** The parapet round the roof with its amber coping, on the shared cornice. */
const PARAPET: Parapet = { height: 0.07, thick: 0.05, bevel: 0.012, coping: 0.018 }
/** On the flat roof: a vent box and a flue, [x, z] from the shop's middle. */
const ROOF = { vent: [0.22, 0.08, 0.14] as Vec3, ventAt: [-0.28, -0.1] as [number, number], flue: 0.028, flueHeight: 0.1, flueAt: [0.34, -0.18] as [number, number] }
/** The fascia over the shopfront: a deep band `height` tall standing `out` from the wall, carrying the sign. */
const FASCIA = { height: 0.16, out: 0.04 }
/**
 * The sign on the fascia: a lit plate in the shop's ember orange, glowing at
 * every hour, framed in amber, with the shop's flame on it in silhouette (no
 * words).
 */
const SIGN = { x: -0.2, size: [0.6, 0.11] as [number, number], frame: 0.014, emblem: [0.036, 0.088] as [number, number], tongue: { size: [0.022, 0.05] as [number, number], x: 0.02, lean: 0.45 } }
/** The front: the shop window left, the door right, two windows upstairs. */
const FRONT = { window: { x: -0.24, size: [0.5, 0.36] as [number, number] }, door: { x: 0.33, width: 0.2, most: 0.48 }, upper: [-0.3, 0.3], upperSize: [0.24, 0.3] as [number, number] }
/** The flame above the door: a bowl on a bracket out of the fascia, the flame standing in it. */
const SCONCE = { out: 0.11, bowl: 0.055, flame: { radius: 0.05, height: 0.2 } }
/** The bowl, turned. */
const BOWL: Point2[] = [[0, 0], [0.018, 0], [0.024, 0.012], [0.05, 0.032], [0.055, 0.045], [0, 0.045]]
/** The lamp at the pavement's corner, the A-board by the door, the planter by the window. */
const LAMP = { at: [-0.72, 0, 0.6] as Vec3, height: 0.5, lantern: 0.042 }
const BOARD = { at: [0.62, 0, 0.5] as Vec3, size: [0.16, 0.24] as [number, number], splay: 0.2, turn: -0.4 }
const PLANTER = { at: [-0.62, 0, 0.36] as Vec3 }

type Colours = Record<'wall' | 'deep' | 'trim' | 'ember' | 'door' | 'metal' | 'paving' | 'green' | 'flame' | 'core' | 'emblem', string>

/** The flame above the door: a bracket out of the fascia's face at `at`, a bowl on it and the flame in the bowl. */
function Sconce({ at, colour }: { at: Vec3; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.03, 0.03, SCONCE.out]} at={[0, 0, SCONCE.out / 2]} color={colour.metal} bevel={0.008} />
      <Turned profile={BOWL} at={[0, 0.006, SCONCE.out]} sides={16} color={colour.trim} />
      <Flame radius={SCONCE.flame.radius} height={SCONCE.flame.height} at={[0, 0.036, SCONCE.out]} color={colour.flame} core={colour.core} />
    </group>
  )
}

/** The sign: an ember-orange lit plate framed in amber, the shop's flame on it in silhouette. `at` is its middle, on the fascia's face. */
function Sign({ at, colour }: { at: Vec3; colour: Colours }) {
  const [w, h] = SIGN.size
  const f = SIGN.frame
  return (
    <group position={at}>
      <Block size={[w + 2 * f, h + 2 * f, 0.02]} at={[0, 0, 0.01]} color={colour.trim} bevel={0.006} />
      <Lit size={[w, h, 0.016]} at={[0, 0, 0.024]} color={colour.ember} day={colour.ember} always outline={false} />
      {/* The shop's flame: a tall tongue and a shorter one leaning out either side of it. */}
      <Extruded shape={flameOutline(...SIGN.emblem)} depth={0.008} at={[0, -SIGN.emblem[1] / 2, 0.034]} color={colour.emblem} bevel={0.002} outline={false} />
      {[-1, 1].map((s) => (
        <Extruded
          key={s}
          shape={flameOutline(...SIGN.tongue.size)}
          depth={0.008}
          at={[s * SIGN.tongue.x, -SIGN.emblem[1] / 2 + 0.004, 0.034]}
          rot={[0, 0, -s * SIGN.tongue.lean]}
          color={colour.emblem}
          bevel={0.002}
          outline={false}
        />
      ))}
      {/* A thin rule either side of the flame, as the shop's own site sets its dividers. */}
      {[-1, 1].map((s) => (
        <Block key={s} size={[w * 0.28, 0.008, 0.006]} at={[s * w * 0.27, 0, 0.034]} color={colour.emblem} bevel={0.002} outline={false} />
      ))}
    </group>
  )
}

/** An A-board by the door, standing on the pavement: two dark boards leaning together, framed in amber, blank. */
function ABoard({ floor, colour }: { floor: number; colour: Colours }) {
  const [w, h] = BOARD.size
  return (
    <group position={[BOARD.at[0], floor, BOARD.at[2]]} rotation={[0, BOARD.turn, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * Math.sin(BOARD.splay) * h * 0.5]} rotation={[s * BOARD.splay, 0, 0]}>
          <Block size={[w, h, 0.016]} at={[0, (h / 2) * Math.cos(BOARD.splay), s * 0.004]} color={colour.trim} bevel={0.005} />
          <Block size={[w - 0.03, h - 0.03, 0.008]} at={[0, (h / 2) * Math.cos(BOARD.splay), s * 0.014]} color={colour.deep} bevel={0.003} outline={false} />
        </group>
      ))}
    </group>
  )
}

/**
 * Ember Tattoo, a studio site the owner built for a tattoo and piercing
 * shop. Its landmark is the shop: a dark two-storey shopfront with an
 * ember-orange sign over its window, amber trim (the shop's own colours,
 * from its site: charcoal, amber and a slate blue), and a flame burning in a
 * bowl above the door, breathing slowly.
 *
 * Three levels of detail. The main mass: the shop and its pavement. The
 * secondary forms: the plinth course, the fascia, the band between the
 * storeys, the cornice and the parapet with its amber coping, the shop window
 * and the door, the windows round every side. The props: the lit sign with
 * the shop's flame on it, the flame in its bowl on its bracket, an A-board, a
 * planter, a street lamp.
 *
 * Built from the ground up: the parapet's top stands at the place's height,
 * from 1.3 to 1.8 (`TattooShop.heights`); the walls take what it leaves, the
 * ground floor a share of them (never too low for the shopfront), the first
 * floor the rest. The flame breathes (still under reduced motion).
 */
export function TattooShop({ place, district }: ModelProps) {
  // Charcoal, as near neutral as the palette goes: indigo warmed by wood.
  const wall = blend(landmark.indigo, landmark.wood, 0.16)
  const colour: Colours = {
    wall,
    deep: blend(wall, landmark.indigo, 0.5),
    trim: blend(landmark.gold, landmark.orange, 0.35),
    // Deep enough in red that its night glow (twice as bright) stays ember orange, not yellow.
    ember: blend(district.color, landmark.red, 0.68),
    door: blend(landmark.slate, landmark.blue, 0.3),
    metal: blend(landmark.slate, landmark.indigo, 0.45),
    paving: blend(landmark.stone, landmark.slate, 0.35),
    green: landmark.green,
    flame: blend(district.color, landmark.red, 0.55),
    core: landmark.gold,
    emblem: blend(landmark.indigo, wall, 0.3),
  }

  const height = heightWithin(place.height, TattooShop.heights)
  const floor = PAVING.height
  const wallTop = height - CORNICE.height - PARAPET.height
  const groundTop = groundTopOf(floor, wallTop, STOREY)
  const upper = wallTop - groundTop
  const { width, depth, z } = BUILDING
  const front = z + depth / 2
  const back = z - depth / 2
  const fasciaFoot = groundTop - FASCIA.height
  const doorHeight = Math.min(FRONT.door.most, fasciaFoot - floor - 0.05)
  const windowY = floor + BUILDING.plinth + 0.06 + FRONT.window.size[1] / 2
  const upperY = groundTop + upper * 0.5
  const upperSize: [number, number] = [FRONT.upperSize[0], Math.min(FRONT.upperSize[1], upper * 0.55)]
  const sideSize: [number, number] = [0.22, Math.min(0.26, upper * 0.5)]

  return (
    <group>
      {/* The pavement, the shop's plinth course and walls, the band between the storeys, the cornice and the parapet with its amber coping. */}
      <ShopShell
        paving={PAVING}
        building={BUILDING}
        storey={STOREY}
        parapet={PARAPET}
        wallTop={wallTop}
        groundTop={groundTop}
        colour={{ paving: colour.paving, plinth: colour.deep, wall: colour.wall, band: colour.trim, cornice: colour.deep, parapet: colour.wall, coping: colour.trim }}
      />
      {/* The fascia over the shopfront. */}
      <Block size={[width + 0.02, FASCIA.height, FASCIA.out + 0.02]} at={[0, fasciaFoot + FASCIA.height / 2, front + FASCIA.out / 2 - 0.01]} color={colour.deep} bevel={0.012} />

      {/* On the roof: a vent box and a flue with its cap. */}
      <Block size={ROOF.vent} at={[ROOF.ventAt[0], wallTop + ROOF.vent[1] / 2 - 0.004, z + ROOF.ventAt[1]]} color={colour.metal} bevel={0.012} />
      <Tube top={ROOF.flue} bottom={ROOF.flue} height={ROOF.flueHeight} at={[ROOF.flueAt[0], wallTop - 0.004, z + ROOF.flueAt[1]]} sides={10} bevel={0.008} color={colour.metal} />
      <Block size={[ROOF.flue * 2.6, 0.016, ROOF.flue * 2.6]} at={[ROOF.flueAt[0], wallTop + ROOF.flueHeight + 0.004, z + ROOF.flueAt[1]]} color={colour.deep} bevel={0.005} />

      {/* The shopfront: the window and the door under the fascia, the sign on it, the flame above the door. */}
      <Window size={FRONT.window.size} at={[FRONT.window.x, windowY, front]} frame={colour.trim} />
      <Door size={[FRONT.door.width, doorHeight]} at={[FRONT.door.x, floor, front]} color={colour.door} frame={colour.trim} step={colour.deep} />
      <Sign at={[SIGN.x, fasciaFoot + FASCIA.height / 2, front + FASCIA.out]} colour={colour} />
      <Sconce at={[FRONT.door.x, fasciaFoot + FASCIA.height * 0.3, front + FASCIA.out]} colour={colour} />

      {/* Upstairs: two windows at the front, one down each side, two at the back; a window down each side below. */}
      {FRONT.upper.map((x) => (
        <Window key={x} size={upperSize} at={[x, upperY, front]} frame={colour.trim} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Window size={sideSize} at={[s * (width / 2), upperY, z]} rot={[0, (s * Math.PI) / 2, 0]} frame={colour.trim} />
          <Window size={[0.22, 0.2]} at={[s * (width / 2), windowY, z - 0.05]} rot={[0, (s * Math.PI) / 2, 0]} frame={colour.trim} />
          <Window size={upperSize} at={[s * 0.3, upperY, back]} rot={[0, Math.PI, 0]} frame={colour.trim} />
        </group>
      ))}

      {/* The pavement's props: an A-board by the door, a planter by the window, the lamp at the corner. */}
      <ABoard floor={floor} colour={colour} />
      <group position={[PLANTER.at[0], floor, PLANTER.at[2]]}>
        <Tube top={0.085} bottom={0.07} height={0.11} sides={8} bevel={0.012} color={colour.deep} />
        <Blob radius={0.085} squash={[1, 0.85, 1]} at={[0, 0.16, 0]} color={colour.green} />
      </group>
      <StreetLamp at={[LAMP.at[0], floor, LAMP.at[2]]} height={LAMP.height} lantern={LAMP.lantern} foot={colour.deep} color={colour.metal} />
    </group>
  )
}

/** Its shadow covers the pavement. */
TattooShop.shadow = 1.05
/** The heights it follows: the walls take what the cornice and parapet leave, the ground floor a share of them. */
TattooShop.heights = [1.3, 1.8] as const
