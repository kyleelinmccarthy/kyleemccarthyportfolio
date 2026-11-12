'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Door, Lit, Signal, Truss, Tube, Turned, Window, blend, heightWithin, pointing, stackUp, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The gravel pad the compound stands on: its middle, its size, its depth. Everything inside stands on its top. */
const PAD = { x: -0.04, z: 0.06, width: 1.62, depth: 1.3, height: 0.025 }
/**
 * The mast, back right of the middle: a concrete footing, three lattice
 * sections narrowing as they go up (banded coral and white, as a mast is
 * painted to be seen), a platform, the antenna pole and the warning lamp on
 * top. The sections take what the place's height leaves.
 */
const MAST = { x: 0.2, z: -0.14, footing: 0.07, widths: [0.3, 0.23, 0.17], deck: 0.03, pole: 0.36, lamp: 0.04 }
/** The sector antennas round the pole: how far out, how big, and how far up the pole their middles are. */
const ANTENNA = { reach: 0.075, size: [0.075, 0.22, 0.028] as Vec3, up: 0.17 }
/** The rings of light: how far out they reach before they have faded, and how many are out at once. */
const RINGS = { reach: 1.15, count: 3 }
/** A microwave dish on the top section, looking out to the front right. */
const DISH: Point2[] = [[0, 0], [0.06, 0.012], [0.09, 0.04], [0.086, 0.046], [0.055, 0.03], [0, 0.024]]
/** The equipment hut, front left, on a low plinth; its door is reached by a ramp. */
const HUT = { x: -0.42, z: 0.22, width: 0.5, height: 0.34, depth: 0.38, plinth: 0.1 }
const RAMP = { run: 0.36, width: 0.14, thickness: 0.025 }
/** The fence round the compound: its corners, its height, and the gap for the gate at the front. */
const FENCE = { x0: -0.84, x1: 0.76, z0: -0.56, z1: 0.7, height: 0.15, spacing: 0.27, gate: [-0.02, 0.36] }

type Colours = Record<'gravel' | 'concrete' | 'band' | 'white' | 'walls' | 'door' | 'metal' | 'leaf' | 'section' | 'ring' | 'ringNight', string>

/** A straight run of the fence from `from` to `to` (x, z): posts along it (not at its ends, with `between`, where another run has them) and two rails. */
function FenceRun({ from, to, colour, between = false }: { from: [number, number]; to: [number, number]; colour: Colours; between?: boolean }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  const turn = Math.atan2(-dz, dx)
  const posts = Math.max(1, Math.round(length / FENCE.spacing))
  const base = PAD.height
  return (
    <group position={[(from[0] + to[0]) / 2, base, (from[1] + to[1]) / 2]} rotation={[0, turn, 0]}>
      {Array.from({ length: posts + 1 }, (_, k) => k).filter((k) => !between || (k > 0 && k < posts)).map((k) => (
        // Thin posts against the rails: no line of their own, or the fence turns to noise.
        <Block key={k} size={[0.018, FENCE.height, 0.018]} at={[-length / 2 + (k * length) / posts, FENCE.height / 2, 0]} color={colour.metal} bevel={0.005} outline={false} />
      ))}
      {[FENCE.height - 0.012, FENCE.height * 0.45].map((y) => (
        <Block key={y} size={[length, 0.012, 0.012]} at={[0, y, 0]} color={colour.metal} bevel={0.004} />
      ))}
    </group>
  )
}

/**
 * AURA. It is an accessibility platform added to any site with one script
 * tag, reaching everyone who visits; so its landmark is a signal mast sending
 * out its signal: rings of light going out from the antennas, slowly, each
 * fading in as it leaves and out to nothing as it widens (never a flash; still
 * under reduced motion; a soft pale light by day, glowing softly at night).
 *
 * Three levels of detail. The main mass: the lattice mast and the equipment
 * hut. The secondary forms: the mast's coral and white sections, its
 * platform and rail, the pole with its three sector antennas, the dish, the
 * hut's roof, door, window and vent, the cable bridge from the hut to the
 * mast, the fence round the compound. The props: the warning lamp on top, the
 * ramp up to the hut's door with its handrail (an accessibility platform's
 * hut has a ramp), the lamp over the door, the cabinet at the mast's foot with
 * its status light, a lamp post by the gate, shrubs.
 *
 * Built from the ground up: the mast's three sections share what the place's
 * height leaves under the platform, the pole and the lamp, so the lamp's top
 * stands at the place's height, from 1.8 to 2.5 (`SignalMast.heights`).
 */
export function SignalMast({ place, district }: ModelProps) {
  const colour: Colours = {
    gravel: blend(landmark.sand, landmark.stone, 0.55),
    concrete: blend(landmark.stone, landmark.slate, 0.3),
    band: landmark.coral,
    white: landmark.offWhite,
    walls: blend(district.color, landmark.cream, 0.62),
    door: blend(district.color, landmark.indigo, 0.45),
    metal: blend(landmark.slate, landmark.indigo, 0.35),
    leaf: landmark.green,
    // The mast's middle section: a steel grey, not white, so it holds against the pale civic hall behind it.
    section: blend(landmark.slate, landmark.indigo, 0.15),
    // The signal is white with a breath of the district's blue at night; by day more of the blue, so it reads against the pale sky.
    ring: blend(landmark.offWhite, district.color, 0.35),
    ringNight: blend(landmark.offWhite, district.color, 0.15),
  }

  const height = heightWithin(place.height, SignalMast.heights)
  const ground = PAD.height
  const section = (height - ground - MAST.footing - MAST.deck - MAST.pole - MAST.lamp) / MAST.widths.length
  const [, ...tops] = stackUp(ground + MAST.footing, [...MAST.widths.map(() => section), MAST.deck, MAST.pole, MAST.lamp])
  const sectionFeet = [ground + MAST.footing, tops[0], tops[1]]
  const deckY = tops[2]
  const poleFoot = tops[3]
  const lampFoot = tops[4]
  const antennaY = poleFoot + ANTENNA.up
  const deckSize = MAST.widths[2] + 0.17

  return (
    <group>
      {/* The compound: a gravel pad inside a fence, a gate at the front. */}
      <Block size={[PAD.width, PAD.height, PAD.depth]} at={[PAD.x, PAD.height / 2, PAD.z]} color={colour.gravel} bevel={0.01} />
      <FenceRun from={[FENCE.x0, FENCE.z0]} to={[FENCE.x1, FENCE.z0]} colour={colour} />
      <FenceRun from={[FENCE.x0, FENCE.z0]} to={[FENCE.x0, FENCE.z1]} colour={colour} between />
      <FenceRun from={[FENCE.x1, FENCE.z0]} to={[FENCE.x1, FENCE.z1]} colour={colour} between />
      <FenceRun from={[FENCE.x0, FENCE.z1]} to={[FENCE.gate[0], FENCE.z1]} colour={colour} />
      <FenceRun from={[FENCE.gate[1], FENCE.z1]} to={[FENCE.x1, FENCE.z1]} colour={colour} />
      {FENCE.gate.map((x) => (
        <Block key={x} size={[0.03, FENCE.height + 0.04, 0.03]} at={[x, ground + (FENCE.height + 0.04) / 2, FENCE.z1]} color={colour.white} bevel={0.007} />
      ))}

      {/* The mast: a footing, three lattice sections narrowing upward, a collar at each joint. */}
      <group position={[MAST.x, 0, MAST.z]}>
        <Block size={[MAST.widths[0] + 0.1, MAST.footing, MAST.widths[0] + 0.1]} at={[0, ground + MAST.footing / 2, 0]} color={colour.concrete} bevel={0.014} />
        {MAST.widths.map((w, k) => (
          <Truss
            key={w}
            height={section + 0.004}
            width={w}
            bays={2}
            at={[0, sectionFeet[k] - 0.002, 0]}
            color={k % 2 === 0 ? colour.band : colour.section}
          />
        ))}
        {MAST.widths.slice(0, -1).map((w, k) => (
          <Block key={w} size={[w + 0.03, 0.022, w + 0.03]} at={[0, tops[k], 0]} color={colour.metal} bevel={0.006} />
        ))}
        {/* The platform, with a rail round it. */}
        <Block size={[deckSize, MAST.deck, deckSize]} at={[0, deckY + MAST.deck / 2, 0]} color={colour.metal} bevel={0.008} />
        {[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2
          const r = deckSize / 2 - 0.01
          return (
            <group key={k} rotation={[0, a, 0]}>
              <Block size={[deckSize - 0.01, 0.01, 0.01]} at={[0, poleFoot + 0.07, r]} color={colour.metal} bevel={0.003} outline={false} />
              <Block size={[0.012, 0.07, 0.012]} at={[r, poleFoot + 0.035, r]} color={colour.metal} bevel={0.004} outline={false} />
            </group>
          )
        })}
        {/* The pole, its three sector antennas facing out round it, and the warning lamp on top. */}
        <Tube top={0.02} bottom={0.024} height={MAST.pole + 0.004} at={[0, poleFoot - 0.002, 0]} color={colour.white} />
        {[0, 1, 2].map((k) => {
          const a = Math.PI / 6 + (k * 2 * Math.PI) / 3
          return (
            <group key={k} rotation={[0, a, 0]}>
              <Block size={[0.014, 0.014, ANTENNA.reach - 0.02]} at={[0, antennaY, (ANTENNA.reach - 0.02) / 2 + 0.01]} color={colour.metal} bevel={0.004} outline={false} />
              <Block size={ANTENNA.size} at={[0, antennaY, ANTENNA.reach]} color={colour.white} bevel={0.01} />
            </group>
          )
        })}
        <Block size={[0.05, 0.012, 0.05]} at={[0, lampFoot - 0.002, 0]} color={colour.metal} bevel={0.004} />
        <Lit size={[MAST.lamp, MAST.lamp, MAST.lamp]} at={[0, lampFoot + MAST.lamp / 2, 0]} color={landmark.red} />
        {/* The dish on the top section, on a short arm out of its face. */}
        <group position={[0, tops[1] + section * 0.45, 0]} rotation={[0, 0.75, 0]}>
          <Block size={[0.016, 0.016, 0.07]} at={[0, 0, MAST.widths[2] / 2 + 0.03]} color={colour.metal} bevel={0.004} outline={false} />
          <Turned profile={DISH} at={[0, 0, MAST.widths[2] / 2 + 0.06]} rot={[Math.PI / 2, 0, 0]} sides={18} color={colour.white} />
          <Tube top={0.005} bottom={0.007} height={0.07} at={[0, 0, MAST.widths[2] / 2 + 0.08]} rot={[Math.PI / 2, 0, 0]} sides={9} bevel={0.003} color={colour.metal} outline={false} />
        </group>
        {/* The cabinet at the mast's foot, with its status light. */}
        <Block size={[0.18, 0.22, 0.1]} at={[-0.02, ground + 0.11, MAST.widths[0] / 2 + 0.14]} color={colour.white} bevel={0.012} />
        <Lit size={[0.018, 0.018, 0.012]} at={[0.04, ground + 0.18, MAST.widths[0] / 2 + 0.195]} color={landmark.green} always outline={false} />
        <Block size={[0.004, 0.16, 0.008]} at={[-0.02, ground + 0.11, MAST.widths[0] / 2 + 0.192]} color={colour.metal} bevel={0.001} outline={false} />
      </group>

      {/* The rings of light, going out from the antennas. */}
      <Signal radius={RINGS.reach} rings={RINGS.count} at={[MAST.x, antennaY, MAST.z]} color={colour.ring} night={colour.ringNight} />

      <Hut colour={colour} />

      {/* The cable bridge from the hut to the mast, on a post. */}
      {(() => {
        const y = ground + HUT.plinth + HUT.height - 0.07
        const run = pointing([HUT.x + HUT.width / 2, y, HUT.z - 0.06], [MAST.x - MAST.widths[0] / 2, y, MAST.z])
        return (
          <>
            <Tube top={0.016} bottom={0.016} height={run.length} at={run.at} rot={run.rot} sides={8} bevel={0.005} color={colour.metal} />
            <Block size={[0.02, y - ground, 0.02]} at={[(HUT.x + HUT.width / 2 + MAST.x - MAST.widths[0] / 2) / 2, ground + (y - ground) / 2 - 0.008, (HUT.z - 0.06 + MAST.z) / 2]} color={colour.metal} bevel={0.005} />
          </>
        )
      })()}

      {/* A lamp post by the gate, and shrubs outside the fence. */}
      <Tube top={0.012} bottom={0.016} height={0.42} at={[0.48, ground, FENCE.z1 + 0.06]} sides={9} bevel={0.005} color={colour.metal} />
      <Block size={[0.06, 0.016, 0.06]} at={[0.48, ground + 0.43, FENCE.z1 + 0.06]} color={colour.metal} bevel={0.005} />
      <Lit size={[0.045, 0.05, 0.045]} at={[0.48, ground + 0.4, FENCE.z1 + 0.06]} color={landmark.lit} />
      {/* Shrubs, sitting on the ground (bedded a little, as a shrub grows from it). */}
      {[
        [-0.95, 0.62, 0.1],
        [-0.78, 0.84, 0.08],
        [0.93, 0.4, 0.09],
      ].map(([x, z, r]) => (
        <Blob key={x} radius={r} squash={[1, 0.9, 1]} at={[x, r * 0.9 - 0.008, z]} color={colour.leaf} />
      ))}
    </group>
  )
}

/**
 * The equipment hut: walls on a concrete plinth under a white roof slab, a
 * door at the front reached by a ramp with a handrail, a window, a lamp over
 * the door, a vent in the side.
 */
function Hut({ colour }: { colour: Colours }) {
  const { x, z, width, height, depth, plinth } = HUT
  const ground = PAD.height
  const floor = ground + plinth
  const front = z + depth / 2
  const door = { x: x + 0.1, width: 0.12, height: 0.22 }
  const landing = { width: 0.22, depth: 0.15 }
  const rampFrom = door.x + landing.width / 2
  // The ramp's top runs from the landing's edge down to the pad, its low end bedded in it a hair.
  const slope = Math.atan2(plinth - RAMP.thickness, RAMP.run)
  const rampLength = Math.hypot(RAMP.run, plinth - RAMP.thickness)
  const rampZ = front + landing.depth / 2
  const rampMid: Vec3 = [
    rampFrom + RAMP.run / 2 + (RAMP.thickness / 2) * Math.sin(slope),
    ground + RAMP.thickness + (plinth - RAMP.thickness) / 2 - (RAMP.thickness / 2) * Math.cos(slope),
    rampZ,
  ]
  const railZ = rampZ + RAMP.width / 2 - 0.01
  const posts: Array<[number, number]> = [
    [rampFrom + 0.02, floor],
    [rampFrom + RAMP.run - 0.03, ground + RAMP.thickness + 0.01],
  ]
  const rail = pointing([posts[0][0], posts[0][1] + 0.12, railZ], [posts[1][0], posts[1][1] + 0.12, railZ])
  return (
    <group>
      <Block size={[width + 0.05, plinth, depth + 0.05]} at={[x, ground + plinth / 2, z]} color={colour.concrete} bevel={0.012} />
      <Block size={[width, height, depth]} at={[x, floor + height / 2, z]} color={colour.walls} bevel={0.02} />
      <Block size={[width + 0.07, 0.04, depth + 0.07]} at={[x, floor + height + 0.02, z]} color={colour.white} bevel={0.012} />
      <Door size={[door.width, door.height]} at={[door.x, floor, front]} color={colour.door} frame={colour.white} step={colour.concrete} border={0.018} />
      <Window size={[0.12, 0.1]} at={[x - 0.12, floor + 0.19, front]} frame={colour.white} border={0.016} />
      <Lit size={[0.045, 0.025, 0.03]} at={[door.x, floor + door.height + 0.05, front + 0.015]} color={landmark.lit} />
      {/* A louvred vent in the left side. */}
      {[0, 1, 2, 3].map((k) => (
        <Block key={k} size={[0.016, 0.014, 0.14]} at={[x - width / 2 - 0.006, floor + 0.14 + k * 0.03, z - 0.04]} rot={[0, 0, 0.35]} color={colour.white} bevel={0.004} outline={false} />
      ))}
      <Block size={[0.012, 0.13, 0.16]} at={[x - width / 2 - 0.002, floor + 0.185, z - 0.04]} color={colour.metal} bevel={0.004} outline={false} />
      {/* The landing at the door and the ramp down from it, with a handrail on its open side. */}
      <Block size={[landing.width, plinth, landing.depth]} at={[door.x, ground + plinth / 2, front + landing.depth / 2]} color={colour.concrete} bevel={0.01} />
      <Block size={[rampLength, RAMP.thickness, RAMP.width]} at={rampMid} rot={[0, 0, -slope]} color={colour.concrete} bevel={0.008} />
      {posts.map(([px, py]) => (
        <Block key={px} size={[0.014, 0.12, 0.014]} at={[px, py + 0.06, railZ]} color={colour.white} bevel={0.004} />
      ))}
      <Tube top={0.008} bottom={0.008} height={rail.length} at={rail.at} rot={rail.rot} sides={8} bevel={0.003} color={colour.white} />
    </group>
  )
}

/** Its shadow covers the compound. */
SignalMast.shadow = 1.05
/** The heights it follows: the mast's sections take up the difference. */
SignalMast.heights = [1.8, 2.5] as const
