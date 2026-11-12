'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Extruded, Flag, Lit, Spin, Striped, Tube, Turned, archOutline, blend, ellipseOutline, heightWithin, pointing, turnedTop, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The ring of trodden sawdust the tent and the pieces stand on. Everything stands on its top. */
const PAD = { radius: 1.12, height: 0.02 }
/**
 * The tent: a striped wall round the ring (a share of the place's height),
 * the striped canopy sweeping up from its eaves to the king pole (what the
 * height leaves), in gores of the two colours, the pole through its peak with
 * the pennant flying from it and a knob on top.
 */
const TENT = { wall: 0.56, eaves: 0.7, wallShare: 0.28, gores: 12, pole: 0.17, poleRadius: 0.012, knob: 0.022 }
/** The canopy's sweep, as shares of its eaves' radius and its rise: concave, as canvas sags between the pole and the eaves. */
const SWEEP: Point2[] = [[0.74, 0.1], [0.48, 0.25], [0.27, 0.48], [0.12, 0.78]]
/** The scalloped valance round the eaves, and a bulb under each scallop. */
const VALANCE = { count: 14, depth: 0.065, bulb: 0.026 }
/** The guy ropes from the eaves to stakes in the ground, between the game pieces. */
const ROPES = { count: 8, stake: 1.0 }
/** The pennant on the king pole: a slim tapering one, sized to the tent's pole. */
const PENNANT = { size: [0.15, 0.065] as [number, number], taper: 1, amount: 0.05, speed: 1.6 }
/** A die's size, and where its pips go on a face (as shares of half its size), by the number shown. */
const DIE = 0.16
const PIPS: Record<number, Point2[]> = {
  1: [[0, 0]],
  2: [[-0.5, 0.5], [0.5, -0.5]],
  3: [[-0.5, 0.5], [0, 0], [0.5, -0.5]],
  4: [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]],
  5: [[-0.5, 0.5], [0.5, 0.5], [0, 0], [-0.5, -0.5], [0.5, -0.5]],
}
/** A pawn, turned: its foot, its body narrowing up to a collar, and its head. */
const PAWN: Point2[] = [[0, 0], [0.07, 0], [0.07, 0.025], [0.05, 0.04], [0.032, 0.13], [0.052, 0.143], [0.052, 0.155], [0.028, 0.166], [0.046, 0.2], [0.04, 0.232], [0, 0.248]]
/** A ball, turned and striped: a circle's half from its foot to its top. */
const BALL = 0.08
const BALL_PROFILE: Point2[] = Array.from({ length: 9 }, (_, k) => {
  const t = -Math.PI / 2 + (k * Math.PI) / 8
  return [Math.abs(BALL * Math.cos(t)) < 1e-9 ? 0 : BALL * Math.cos(t), BALL * Math.sin(t)] as Point2
})

type Colours = Record<'canvas' | 'stripe' | 'trim' | 'sawdust' | 'rope' | 'stake' | 'doorway' | 'die' | 'pip' | 'pawn' | 'card' | 'ball' | 'ballStripe', string>

/** A die standing on the ground at `at`, turned `turn` about the upright, showing `top`, `front` and `right` pips. */
function Die({ at, turn, faces, colour }: { at: Vec3; turn: number; faces: [number, number, number]; colour: Colours }) {
  const half = DIE / 2
  const pip = ellipseOutline(0.014, 0.014, 8)
  // Each face: where it is, how it is turned to face out, and the pips it shows.
  const sides: Array<{ at: Vec3; rot: Vec3; count: number }> = [
    { at: [0, DIE + 0.002, 0], rot: [-Math.PI / 2, 0, 0], count: faces[0] },
    { at: [0, half, half + 0.002], rot: [0, 0, 0], count: faces[1] },
    { at: [half + 0.002, half, 0], rot: [0, Math.PI / 2, 0], count: faces[2] },
  ]
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Block size={[DIE, DIE, DIE]} at={[0, half, 0]} color={colour.die} bevel={0.026} />
      {sides.map((side) => (
        <group key={side.count} position={side.at} rotation={side.rot}>
          {PIPS[side.count].map(([x, y]) => (
            <Extruded key={`${x}${y}`} shape={pip} depth={0.006} at={[x * half * 0.9, y * half * 0.9, 0]} color={colour.pip} outline={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** A playing card at `at`, turned by `rot`: a white card with a diamond on its face. */
function Card({ at, rot, colour }: { at: Vec3; rot: Vec3; colour: Colours }) {
  return (
    <group position={at} rotation={rot}>
      <Block size={[0.1, 0.14, 0.008]} color={colour.card} bevel={0.003} />
      <Extruded shape={[[0, 0.04], [0.026, 0], [0, -0.04], [-0.026, 0]]} depth={0.004} at={[0, 0, 0.005]} color={colour.stripe} outline={false} />
    </group>
  )
}

/**
 * Ruckus. It is ten multiplayer party games, so its landmark is a big top: a
 * striped circus tent with a pennant flying from its king pole, scallops and
 * a string of bulbs round its eaves, and giant game pieces around it on the
 * sawdust: two dice, a pawn, playing cards and a striped ball turning slowly.
 *
 * Three levels of detail. The main mass: the striped wall and the canopy.
 * The secondary forms: the scalloped valance, the doorway with its curtains
 * tied back, the king pole, the guy ropes and their stakes. The props: the
 * pennant, the bulbs (off by day, lit at night), the dice and their pips, the
 * pawn, the cards, the ball.
 *
 * Built from the ground up: the wall is a share of the place's height and the
 * canopy rises to what the height leaves under the pole, so the knob on the
 * pole stands at the place's height, from 1.2 to 1.8 (`BigTop.heights`). The
 * pennant waves and the ball turns (both still under reduced motion).
 */
export function BigTop({ place, district }: ModelProps) {
  const colour: Colours = {
    canvas: landmark.coral,
    stripe: landmark.cream,
    trim: landmark.gold,
    sawdust: blend(landmark.sand, landmark.wood, 0.25),
    rope: blend(landmark.wood, landmark.cream, 0.35),
    stake: blend(landmark.wood, landmark.indigo, 0.3),
    // The dark inside of the tent through its doorway.
    doorway: blend(landmark.indigo, district.color, 0.12),
    die: landmark.offWhite,
    pip: blend(landmark.indigo, district.color, 0.2),
    pawn: blend(district.color, landmark.indigo, 0.12),
    card: landmark.offWhite,
    ball: landmark.gold,
    // The ball's second colour: a blue that stands clear of its gold (white beside gold barely read).
    ballStripe: landmark.blue,
  }

  const height = heightWithin(place.height, BigTop.heights)
  const ground = PAD.height
  const wall = height * TENT.wallShare
  const eavesY = ground + wall
  // The canopy rises to what is left under the pole and its knob; its rounded peak stands a little under its nominal rise.
  const canopy = (rise: number): Point2[] => [[0, 0], [TENT.eaves, 0], [TENT.eaves, 0.03], ...SWEEP.map(([r, y]) => [r * TENT.eaves, 0.03 + y * (rise - 0.03)] as Point2), [0, rise]]
  const wanted = height - eavesY - TENT.pole - 2 * TENT.knob + 0.02
  const rise = wanted + (wanted - turnedTop(canopy(wanted)))
  const peak = eavesY + turnedTop(canopy(rise))
  // The pole stands from a little inside the peak.
  const poleFoot = peak - 0.02
  const poleTop = poleFoot + TENT.pole
  const wallProfile: Point2[] = [[0, 0], [TENT.wall, 0], [TENT.wall - 0.012, wall], [0, wall]]

  // A scallop: half an oval hanging from the eaves.
  const scallopWidth = (2 * Math.PI * TENT.eaves) / VALANCE.count
  const scallop: Point2[] = Array.from({ length: 7 }, (_, k) => {
    const t = (k * Math.PI) / 6
    return [-(scallopWidth / 2) * Math.cos(t), -VALANCE.depth * Math.sin(t)] as Point2
  })

  return (
    <group>
      {/* The sawdust ring. */}
      <Tube top={PAD.radius - 0.02} bottom={PAD.radius} height={PAD.height} sides={28} bevel={0.01} color={colour.sawdust} />

      {/* The tent: the wall and the canopy, their gores lined up, the doorway at the front. */}
      <Striped profile={wallProfile} at={[0, ground, 0]} stripes={TENT.gores} sides={24} color={colour.canvas} stripe={colour.stripe} />
      <Striped profile={canopy(rise)} at={[0, eavesY, 0]} stripes={TENT.gores} sides={24} color={colour.canvas} stripe={colour.stripe} />
      <Extruded shape={archOutline(0.2, Math.min(0.3, wall - 0.04))} depth={0.024} at={[0, ground, TENT.wall - 0.004]} color={colour.doorway} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* A curtain tied back to each side of the doorway, with its gold tie. */}
          <Extruded
            shape={[[0, 0], [s * 0.05, 0], [s * 0.012, Math.min(0.3, wall - 0.04) * 0.55], [s * 0.012, Math.min(0.3, wall - 0.04)], [0, Math.min(0.3, wall - 0.04)]]}
            depth={0.014}
            at={[s * 0.1, ground, TENT.wall + 0.012]}
            color={colour.canvas}
          />
          <Blob radius={0.012} at={[s * 0.115, ground + Math.min(0.3, wall - 0.04) * 0.5, TENT.wall + 0.022]} color={colour.trim} />
        </group>
      ))}

      {/* The scalloped valance round the eaves, a bulb under each scallop. */}
      {Array.from({ length: VALANCE.count }, (_, k) => {
        const a = ((k + 0.5) / VALANCE.count) * Math.PI * 2
        const r = TENT.eaves + 0.004
        return (
          <group key={k} rotation={[0, a, 0]}>
            <Extruded shape={scallop} depth={0.012} at={[0, eavesY + 0.012, r]} color={colour.trim} />
            <Lit size={[VALANCE.bulb, VALANCE.bulb, VALANCE.bulb]} at={[0, eavesY + 0.012 - VALANCE.depth - VALANCE.bulb / 2, r + 0.004]} color={landmark.lit} outline={false} />
          </group>
        )
      })}

      {/* The guy ropes, from the eaves out to stakes in the sawdust. */}
      {Array.from({ length: ROPES.count }, (_, k) => {
        const a = ((k + 0.5) / ROPES.count) * Math.PI * 2
        const from: Vec3 = [TENT.eaves * Math.sin(a), eavesY + 0.02, TENT.eaves * Math.cos(a)]
        const to: Vec3 = [ROPES.stake * Math.sin(a), ground + 0.05, ROPES.stake * Math.cos(a)]
        const rope = pointing(from, to)
        return (
          <group key={k}>
            <Tube top={0.005} bottom={0.005} height={rope.length} at={rope.at} rot={rope.rot} sides={6} bevel={0.002} color={colour.rope} outline={false} />
            <Block size={[0.022, 0.07, 0.022]} at={[to[0], ground + 0.03, to[2]]} rot={[0, a, -0.25]} color={colour.stake} bevel={0.005} />
          </group>
        )
      })}

      {/* The king pole through the peak, the pennant flying from it, the knob on top. */}
      <Tube top={TENT.poleRadius} bottom={TENT.poleRadius + 0.003} height={TENT.pole} at={[0, poleFoot, 0]} sides={10} bevel={0.004} color={colour.stake} />
      <Blob radius={TENT.knob} at={[0, poleTop + TENT.knob * 0.8, 0]} color={colour.trim} />
      <Flag size={PENNANT.size} taper={PENNANT.taper} amount={PENNANT.amount} speed={PENNANT.speed} at={[TENT.poleRadius, poleTop - 0.012, 0]} color={district.color} />

      {/* The game pieces round the tent: two dice, a pawn, cards, a ball. */}
      <Die at={[0.76, ground, 0.6]} turn={0.5} faces={[1, 3, 2]} colour={colour} />
      <Die at={[-0.98, ground, 0.05]} turn={-0.9} faces={[5, 4, 2]} colour={colour} />
      <Turned profile={PAWN} at={[-0.62, ground, 0.72]} color={colour.pawn} />
      <Card at={[0.52, ground + 0.068, 0.83]} rot={[-0.25, 0.55, 0]} colour={colour} />
      <Card at={[0.12, ground + 0.005, 0.98]} rot={[-Math.PI / 2, 0, 0.4]} colour={colour} />
      <Spin at={[0.95, ground + BALL, -0.2]} speed={0.5}>
        <Striped profile={BALL_PROFILE} stripes={6} color={colour.ball} stripe={colour.ballStripe} />
      </Spin>
    </group>
  )
}

/** Its shadow covers the tent and its pieces. */
BigTop.shadow = 1.1
/** The heights it follows: the canopy rises to take up the difference. */
BigTop.heights = [1.2, 1.8] as const
