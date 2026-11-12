'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Bob, Extruded, Rounded, StreetLamp, Turned, blend, heightWithin, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The paved square: its size, where its middle stands, the slabs across and deep, the joint between them. */
const PAVING = { width: 1.56, depth: 1.0, z: -0.04, height: 0.03, across: 4, deep: 3, joint: 0.014 }
/**
 * The pillar box, standing at `z`: its radius, the plinth it stands on, the
 * cap's rim reaching out over the body and the dome over it, all as heights
 * and radii; the body takes what the letter over it leaves.
 */
const PILLAR = { z: -0.06, radius: 0.165, plinth: 0.065, plinthRadius: 0.2, rim: 0.06, rimReach: 0.027, dome: 0.12 }
/** The slot under the cap's rim, its hood over it; the door on the front with its blank plate and keyhole; as sizes and heights under the rim. */
const SLOT = { width: 0.15, height: 0.022, below: 0.06, hood: 0.02 }
const DOOR = { width: 0.15, height: 0.22, below: 0.14, proud: 0.008, plate: [0.09, 0.055] as [number, number] }
/**
 * The letter hovering over it: its size, its tilt (up to the camera and a
 * little aslant), how far it bobs and how slowly, and the gap kept between
 * the bottom of its bob and the box's top.
 */
const LETTER = { size: [0.22, 0.145, 0.01] as Vec3, tilt: [-0.25, 0.1, 0.16] as Vec3, bob: 0.025, speed: 1.1, gap: 0.03 }
/** The bench at the left of the square, its legs on the paving, and the bundle of letters tied up on it (`step` apart in the pile). */
const BENCH = { at: [-0.5, 0, 0.1] as Vec3, length: 0.56, seat: 0.19, depth: 0.15, slats: 3, back: 0.15, turn: 0.35 }
const BUNDLE = { at: 0.14, letters: 3, step: 0.009 }
/** An envelope lying flat: width, thickness, depth. */
const ENVELOPE: Vec3 = [0.13, 0.008, 0.09]
/** The hedge along the back of the square, and the blossom on it. */
const HEDGE = {
  size: [1.12, 0.26, 0.2] as Vec3,
  z: -0.4,
  /** The rounded lumps along its top, across and their radius, so its top is not one smooth line. */
  lumps: [
    [-0.36, 0.1],
    [-0.06, 0.115],
    [0.27, 0.1],
  ] as Array<[number, number]>,
}
const BLOSSOM: Vec3[] = [
  [-0.38, 0.28, -0.32],
  [-0.12, 0.3, -0.33],
  [0.2, 0.29, -0.32],
  [0.42, 0.26, -0.33],
]
/** A letter dropped on the paving by the box's foot. */
const DROPPED = { at: [0.3, 0, 0.22] as Vec3, turn: 0.6 }
/** The street lamp at the square's back right corner, by the hedge's end. */
const LAMP = { at: [0.6, 0, -0.18] as Vec3, height: 0.62, lantern: 0.042 }

type Colours = Record<'red' | 'deep' | 'plinth' | 'slot' | 'plate' | 'paving' | 'joint' | 'wood' | 'iron' | 'paper' | 'stamp' | 'string' | 'hedge' | 'blossom', string>

/** The envelope's flap, a shallow triangle across its back, standing on its top edge. */
function flapOutline(width: number, depth: number): Point2[] {
  return [
    [-width / 2, 0],
    [0, -depth],
    [width / 2, 0],
  ]
}

/** An envelope lying flat, its middle at `at`, turned `turn` about the upright: no words on it, a stamp in its corner. */
function LyingLetter({ at, turn, colour, stamp = true }: { at: Vec3; turn: number; colour: Colours; stamp?: boolean }) {
  const [w, t, d] = ENVELOPE
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Block size={ENVELOPE} at={[0, t / 2, 0]} color={colour.paper} bevel={0.003} />
      {stamp && <Block size={[0.024, 0.003, 0.028]} at={[w / 2 - 0.022, 0.009, -d / 2 + 0.022]} color={colour.stamp} bevel={0.001} outline={false} />}
    </group>
  )
}

/**
 * Send me a letter, the contact place: a red pillar box, classic and well
 * proportioned, on a small paved square: a black plinth, the round body, a
 * cap with a rim and a dome, the slot under the cap's hood, and a door with a
 * keyhole and a blank plate. A letter hovers over it, bobbing gently (`Bob`),
 * waiting to go in. Round it, the story: a bench where someone left a bundle
 * of letters tied with string, a letter dropped on the paving, and a hedge in
 * blossom behind. No words anywhere: not on the box, the plate or the
 * letters.
 *
 * Three levels of detail. The main mass: the pillar box. The secondary forms:
 * the plinth, the cap's rim and dome, the slot and hood, the door, the paving
 * slabs, the hedge, the bench. The props: the letter, the stamps, the bundle
 * and its string, the dropped letter, the blossom, the keyhole and plate.
 *
 * Built from the top down: the hovering letter's top stands at the place's
 * height, from 1.0 to 1.2 (`Postbox.heights`); the box's body takes what the
 * letter and the gap under its bob leave.
 */
export function Postbox({ place, district }: ModelProps) {
  const colour: Colours = {
    red: landmark.red,
    deep: blend(landmark.red, landmark.indigo, 0.3),
    plinth: blend(landmark.indigo, landmark.slate, 0.25),
    slot: blend(landmark.indigo, landmark.red, 0.2),
    plate: landmark.cream,
    paving: blend(landmark.stone, landmark.sand, 0.35),
    joint: blend(landmark.slate, landmark.stone, 0.35),
    wood: landmark.wood,
    iron: blend(district.color, landmark.indigo, 0.55),
    paper: landmark.offWhite,
    stamp: district.color,
    string: blend(landmark.sand, landmark.wood, 0.4),
    hedge: blend(landmark.green, landmark.teal, 0.2),
    blossom: landmark.pink,
  }

  const height = heightWithin(place.height, Postbox.heights)
  const [lw, lh] = LETTER.size
  // How far the letter reaches above and below its middle, tilted as it is.
  const letterHalf = (lh / 2) * Math.cos(LETTER.tilt[2]) * Math.cos(LETTER.tilt[0]) + (lw / 2) * Math.abs(Math.sin(LETTER.tilt[2])) + LETTER.size[2]
  const letterY = height - letterHalf
  const boxTop = letterY - letterHalf - LETTER.bob - LETTER.gap
  const floor = PAVING.height
  const { radius: r, plinth, plinthRadius, rim, rimReach, dome } = PILLAR
  const rimY = boxTop - dome - rim
  const body = rimY - floor - plinth
  const bodyProfile: Point2[] = [
    [0, 0],
    [r + 0.004, 0],
    [r, body],
    [r + rimReach, body + 0.014],
    [r + rimReach + 0.002, body + rim - 0.012],
    [r + 0.006, body + rim],
    [r * 0.94, body + rim + dome * 0.35],
    [r * 0.62, body + rim + dome * 0.8],
    [r * 0.2, body + rim + dome * 0.98],
    [0, body + rim + dome],
  ]
  const slotY = rimY - SLOT.below
  const doorY = rimY - DOOR.below - DOOR.height / 2
  // A flat plate on the round body: its face stands `proud` of the surface, its back sunk into it at its edges.
  const flatOn = (width: number, proud: number) => ({ z: r + proud, depth: r + proud - Math.sqrt(r * r - (width / 2) ** 2) + 0.012 })
  const slot = flatOn(SLOT.width, 0.006)
  const hood = flatOn(SLOT.width + 0.04, 0.03)
  const door = flatOn(DOOR.width, DOOR.proud)
  const slabW = (PAVING.width - (PAVING.across + 1) * PAVING.joint) / PAVING.across
  const slabD = (PAVING.depth - (PAVING.deep + 1) * PAVING.joint) / PAVING.deep

  return (
    <group>
      {/* The paved square: a bed of mortar and the slabs laid on it. */}
      <Block size={[PAVING.width, floor - 0.01, PAVING.depth]} at={[0, (floor - 0.01) / 2, PAVING.z]} color={colour.joint} bevel={0.008} />
      {Array.from({ length: PAVING.across * PAVING.deep }, (_, k) => {
        const i = k % PAVING.across
        const j = Math.floor(k / PAVING.across)
        const x = -PAVING.width / 2 + PAVING.joint + slabW / 2 + i * (slabW + PAVING.joint)
        const z = PAVING.z - PAVING.depth / 2 + PAVING.joint + slabD / 2 + j * (slabD + PAVING.joint)
        return <Block key={k} size={[slabW, 0.02, slabD]} at={[x, floor - 0.01, z]} color={colour.paving} bevel={0.006} outline={false} />
      })}

      {/* The hedge behind, in blossom. */}
      <Rounded size={HEDGE.size} round={0.55} at={[0, floor + HEDGE.size[1] / 2 - 0.01, HEDGE.z]} color={colour.hedge} />
      {HEDGE.lumps.map(([x, r]) => (
        <Blob key={x} radius={r} squash={[1.2, 0.8, 0.85]} at={[x, floor + HEDGE.size[1] - 0.02, HEDGE.z - 0.01]} color={colour.hedge} />
      ))}
      {BLOSSOM.map(([x, y, z]) => (
        <Blob key={x} radius={0.022} squash={[1, 0.8, 1]} at={[x, floor + y, z + HEDGE.size[2] / 2 + 0.02]} color={colour.blossom} />
      ))}

      {/* The pillar box: plinth, body with cap and dome, the slot under its hood, the door with its plate and keyhole. */}
      <group position={[0, floor, PILLAR.z]}>
        <Turned profile={[[0, 0], [plinthRadius, 0], [plinthRadius, plinth * 0.7], [r + 0.012, plinth], [0, plinth]]} color={colour.plinth} />
        <Turned profile={bodyProfile} at={[0, plinth - 0.004, 0]} color={colour.red} />
        <Block size={[SLOT.width + 0.04, SLOT.hood, hood.depth]} at={[0, slotY - floor + SLOT.height / 2 + SLOT.hood / 2, hood.z - hood.depth / 2]} color={colour.red} bevel={0.007} />
        <Block size={[SLOT.width, SLOT.height, slot.depth]} at={[0, slotY - floor, slot.z - slot.depth / 2]} color={colour.slot} bevel={0.005} />
        <Block size={[DOOR.width, DOOR.height, door.depth]} at={[0, doorY - floor, door.z - door.depth / 2]} color={colour.deep} bevel={0.01} />
        <Block size={[DOOR.width - 0.03, DOOR.height - 0.03, 0.01]} at={[0, doorY - floor, door.z + 0.002]} color={colour.red} bevel={0.005} outline={false} />
        <Block size={[DOOR.plate[0], DOOR.plate[1], 0.008]} at={[0, doorY - floor + DOOR.height * 0.2, door.z + 0.007]} color={colour.plate} bevel={0.003} />
        <Block size={[0.012, 0.022, 0.006]} at={[0, doorY - floor - DOOR.height * 0.22, door.z + 0.007]} color={colour.slot} bevel={0.002} outline={false} />
      </group>

      {/* The bench, and the bundle of letters tied with string on it. */}
      <group position={BENCH.at} rotation={[0, BENCH.turn, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (BENCH.length / 2 - 0.05), floor, 0]}>
            <Block size={[0.03, BENCH.seat, 0.03]} at={[0, BENCH.seat / 2 - 0.004, BENCH.depth / 2 - 0.03]} color={colour.iron} bevel={0.008} />
            <Block size={[0.03, BENCH.seat + BENCH.back, 0.03]} at={[0, (BENCH.seat + BENCH.back) / 2 - 0.004, -BENCH.depth / 2 + 0.015]} color={colour.iron} bevel={0.008} />
            <Block size={[0.032, 0.025, BENCH.depth]} at={[0, BENCH.seat - 0.03, 0]} color={colour.iron} bevel={0.008} />
          </group>
        ))}
        {Array.from({ length: BENCH.slats }, (_, k) => (
          <Block key={k} size={[BENCH.length, 0.022, BENCH.depth / BENCH.slats - 0.01]} at={[0, floor + BENCH.seat - 0.007, -BENCH.depth / 2 + (k + 0.5) * (BENCH.depth / BENCH.slats)]} color={colour.wood} bevel={0.007} />
        ))}
        {[0.06, 0.12].map((y) => (
          <Block key={y} size={[BENCH.length, 0.04, 0.02]} at={[0, floor + BENCH.seat + y, -BENCH.depth / 2 + 0.01]} color={colour.wood} bevel={0.008} />
        ))}
        <group position={[BUNDLE.at, floor + BENCH.seat + 0.004, 0.005]} rotation={[0, -0.3, 0]}>
          {Array.from({ length: BUNDLE.letters }, (_, k) => (
            <LyingLetter key={k} at={[(k % 2) * 0.006, k * BUNDLE.step, -(k % 2) * 0.005]} turn={(k - 1) * 0.06} colour={colour} stamp={k === BUNDLE.letters - 1} />
          ))}
          <Block size={[0.008, BUNDLE.letters * BUNDLE.step + 0.008, ENVELOPE[2] + 0.006]} at={[0, (BUNDLE.letters * BUNDLE.step) / 2 + 0.002, 0]} color={colour.string} bevel={0.002} outline={false} />
          <Block size={[ENVELOPE[0] + 0.006, BUNDLE.letters * BUNDLE.step + 0.008, 0.008]} at={[0, (BUNDLE.letters * BUNDLE.step) / 2 + 0.002, 0]} color={colour.string} bevel={0.002} outline={false} />
        </group>
      </group>

      <LyingLetter at={[DROPPED.at[0], floor, DROPPED.at[2]]} turn={DROPPED.turn} colour={colour} />
      <StreetLamp at={[LAMP.at[0], floor, LAMP.at[2]]} height={LAMP.height} lantern={LAMP.lantern} foot={colour.iron} color={colour.iron} />

      {/* The letter, hovering and bobbing over the box: no words, a stamp at its corner, its flap on the back with a seal. */}
      <Bob at={[0, letterY, PILLAR.z + 0.02]} amount={LETTER.bob} speed={LETTER.speed}>
        <group rotation={LETTER.tilt}>
          <Block size={LETTER.size} color={colour.paper} bevel={0.004} />
          <Block size={[0.036, 0.042, 0.004]} at={[lw / 2 - 0.03, lh / 2 - 0.032, LETTER.size[2] / 2 + 0.001]} color={colour.stamp} bevel={0.0015} />
          <Extruded shape={flapOutline(lw - 0.01, lh * 0.55)} depth={0.003} at={[0, lh / 2 - 0.004, -LETTER.size[2] / 2 - 0.001]} rot={[0, Math.PI, 0]} color={colour.paper} bevel={0.001} />
          <Blob radius={0.016} squash={[1, 1, 0.4]} at={[0, lh / 2 - lh * 0.5, -LETTER.size[2] / 2 - 0.006]} color={colour.red} />
        </group>
      </Bob>
    </group>
  )
}

/** Its shadow covers the paved square. */
Postbox.shadow = 0.95
/** The heights it follows: the letter's top at the place's height, the box's body taking what is left under it. */
Postbox.heights = [1.0, 1.2] as const
