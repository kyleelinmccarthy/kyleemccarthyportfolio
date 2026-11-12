'use client'

import { landmark } from '@/content/sky'
import { Block, Blob, Door, Extruded, FOOTPRINT, Lit, Roof, Sway, Turned, Window, blend, roundedRectOutline, starOutline, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/**
 * The building's proportions, in model units. Its width runs left to right,
 * its depth front to back; the front faces +Z.
 */
const BODY = { width: 1.0, depth: 0.84 }
/** The plinth it stands on: a little wider than the walls all round. */
const BASE = { height: 0.12, reach: 0.05 }
/** The roof: its rise is this share of the building's height, within these bounds. */
const ROOF = { share: 0.3, min: 0.34, max: 0.46, overhang: 0.09 }
/** A storey, and the trim band under the eaves and between storeys. */
const STOREY = 0.48
const BAND = { height: 0.05, reach: 0.025 }
/** Corner pilasters. */
const PILASTER = 0.07
const DOOR = { width: 0.24, height: 0.34 }
const WINDOW = { ground: [0.15, 0.2] as [number, number], upper: [0.15, 0.22] as [number, number], apart: 0.32 }
const CHIMNEY = { size: 0.13, x: 0.27, z: -0.15, above: 0.09, from: 0.35, cap: 0.035 }
/** The hanging sign's bracket, out from the right-hand corner, and the lamp left of the door. */
const SIGN = { x: 0.44, reach: 0.17, board: [0.15, 0.11] as [number, number] }
const LAMP_X = -0.19

/** A small potted shrub: a turned pot and a round bush. */
function Planter({ at }: { at: Vec3 }) {
  return (
    <group position={at}>
      <Turned profile={[[0, 0], [0.05, 0], [0.065, 0.09], [0.07, 0.1], [0, 0.1]]} color={landmark.brick} />
      <Blob radius={0.075} squash={[1, 0.9, 1]} at={[0, 0.15, 0]} color={landmark.green} />
    </group>
  )
}

/**
 * The fallback landmark for a model key with none of its own (no place uses
 * it now), and the kit's worked example: a small, well-made building in its
 * district's colour, standing as tall as the place says its landmark is, so
 * the camera and the label above it frame it as they would a landmark.
 *
 * Three levels of detail. The main mass: a plinth, the walls and a gabled
 * roof with deep eaves. The secondary forms: corner pilasters, trim bands,
 * a panelled door under a canopy, framed windows with sills on every side and
 * every storey, and a chimney. The props that reward a close-up: a hanging
 * sign with a star on it, a lamp by the door, and two potted shrubs.
 */
export function GenericModel({ place, district }: ModelProps) {
  const colour = {
    wall: blend(district.color, landmark.cream, 0.45),
    // Dusty, like slate tiles: the district colour greyed toward slate, then deepened toward indigo.
    roof: blend(blend(district.color, landmark.slate, 0.32), landmark.indigo, 0.18),
    door: blend(blend(district.color, landmark.slate, 0.15), landmark.indigo, 0.22),
    trim: landmark.offWhite,
    base: blend(landmark.stone, landmark.slate, 0.3),
  }
  const { width, depth } = BODY
  const rise = Math.min(ROOF.max, Math.max(ROOF.min, place.height * ROOF.share))
  const eaves = Math.max(place.height - rise, BASE.height + STOREY * 0.8)
  const wall = eaves - BASE.height
  const storeys = Math.max(1, Math.floor(wall / STOREY + 0.25))
  const storey = wall / storeys
  const front = depth / 2
  // The middle of each storey's windows, a little above half way up it.
  const windowY = (k: number) => BASE.height + storey * k + storey * 0.55
  const chimneyFoot = eaves + rise * CHIMNEY.from
  // Clear of the ridge, but its cap never past the footprint's height (2.6) at the tallest places.
  const chimneyTop = Math.min(eaves + rise + CHIMNEY.above, FOOTPRINT.height - CHIMNEY.cap / 2 - 0.01)
  // The sign's bracket sits just under the first trim band.
  const signY = BASE.height + storey - BAND.height - 0.035

  return (
    <group>
      {/* The main mass. */}
      <Block size={[width + 2 * BASE.reach, BASE.height, depth + 2 * BASE.reach]} at={[0, BASE.height / 2, 0]} color={colour.base} />
      <Block size={[width, wall + 0.02, depth]} at={[0, BASE.height + wall / 2 - 0.01, 0]} color={colour.wall} bevel={0.03} />
      <Roof size={[width, rise, depth]} at={[0, eaves, 0]} overhang={ROOF.overhang} color={colour.roof} />

      {/* Trim: corner pilasters, a band under the eaves and one between each storey. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Block
            key={`${sx}${sz}`}
            size={[PILASTER, wall, PILASTER]}
            at={[sx * (width / 2 - PILASTER / 2 + 0.012), BASE.height + wall / 2, sz * (front - PILASTER / 2 + 0.012)]}
            color={colour.trim}
            bevel={0.02}
          />
        )),
      )}
      {Array.from({ length: storeys }, (_, k) => (
        <Block
          key={k}
          size={[width + 2 * BAND.reach, BAND.height, depth + 2 * BAND.reach]}
          at={[0, BASE.height + storey * (k + 1) - BAND.height / 2, 0]}
          color={colour.trim}
          bevel={0.018}
        />
      ))}

      {/* The front: a door under a canopy on the ground floor, windows either side and on every storey above. */}
      <Door size={[DOOR.width, DOOR.height]} at={[0, BASE.height, front]} color={colour.door} frame={colour.trim} />
      <Roof
        size={[DOOR.width + 0.14, 0.09, 0.12]}
        style="shed"
        overhang={0.02}
        fascia={0.035}
        bevel={0.015}
        courses={2}
        at={[0, BASE.height + DOOR.height + 0.045, front + 0.07]}
        color={colour.roof}
      />
      {[-1, 1].map((side) => (
        <Window key={side} size={WINDOW.ground} at={[side * WINDOW.apart, windowY(0), front]} frame={colour.trim} />
      ))}
      {Array.from({ length: storeys - 1 }, (_, k) =>
        [-1, 0, 1].map((side) => (
          <Window key={`${k}${side}`} size={WINDOW.upper} at={[side * WINDOW.apart, windowY(k + 1), front]} frame={colour.trim} />
        )),
      )}

      {/* The sides and the back: one window a storey, so it is a building from every side the camera circles to. */}
      {Array.from({ length: storeys }, (_, k) => (
        <group key={k}>
          <Window size={WINDOW.upper} at={[width / 2, windowY(k), 0]} rot={[0, Math.PI / 2, 0]} frame={colour.trim} />
          <Window size={WINDOW.upper} at={[-width / 2, windowY(k), 0]} rot={[0, -Math.PI / 2, 0]} frame={colour.trim} />
          <Window size={WINDOW.upper} at={[0, windowY(k), -front]} rot={[0, Math.PI, 0]} frame={colour.trim} />
        </group>
      ))}

      {/* A brick chimney up through the back slope and clear of the ridge, with a cap. */}
      <Block
        size={[CHIMNEY.size, chimneyTop - chimneyFoot, CHIMNEY.size]}
        at={[CHIMNEY.x, (chimneyTop + chimneyFoot) / 2, CHIMNEY.z]}
        color={landmark.brick}
        bevel={0.02}
      />
      <Block
        size={[CHIMNEY.size + 0.04, CHIMNEY.cap, CHIMNEY.size + 0.04]}
        at={[CHIMNEY.x, chimneyTop, CHIMNEY.z]}
        color={colour.trim}
        bevel={0.012}
      />

      {/* Props: a sign hung from a bracket that rocks a little, a lamp by the door, shrubs either side of the step. */}
      <Block
        size={[0.026, 0.026, SIGN.reach]}
        at={[SIGN.x, signY, front + SIGN.reach / 2]}
        color={landmark.indigo}
        bevel={0.008}
      />
      <Sway at={[SIGN.x, signY - 0.012, front + SIGN.reach - 0.03]} axis="x" amount={0.07} speed={1.1}>
        <Block size={[0.008, 0.03, 0.008]} at={[-0.05, -0.015, 0]} color={landmark.indigo} bevel={0.003} outline={false} />
        <Block size={[0.008, 0.03, 0.008]} at={[0.05, -0.015, 0]} color={landmark.indigo} bevel={0.003} outline={false} />
        <Extruded shape={roundedRectOutline(...SIGN.board, 0.025)} depth={0.024} at={[0, -0.03 - SIGN.board[1] / 2, 0]} color={colour.door} />
        <Extruded shape={starOutline(5, 0.036, 0.016)} depth={0.012} at={[0, -0.03 - SIGN.board[1] / 2, 0.016]} color={landmark.gold} />
      </Sway>
      <Block size={[0.05, 0.03, 0.05]} at={[LAMP_X, BASE.height + DOOR.height * 0.62, front + 0.02]} color={landmark.indigo} bevel={0.01} />
      <Lit size={[0.045, 0.07, 0.045]} at={[LAMP_X, BASE.height + DOOR.height * 0.62 + 0.05, front + 0.04]} color={landmark.lit} />
      <Planter at={[-0.21, 0, front + 0.14]} />
      <Planter at={[0.21, 0, front + 0.14]} />
    </group>
  )
}

/** Its shadow reaches a little past the plinth's corners. */
GenericModel.shadow = 1.0
