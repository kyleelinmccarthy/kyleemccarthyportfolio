'use client'

import { landmark } from '@/content/sky'
import {
  Blob,
  Block,
  Brickwork,
  pictureAspect,
  Door,
  Extruded,
  Lit,
  Peak,
  Picture,
  Rounded,
  Sway,
  Tube,
  Tufted,
  Water,
  Weather,
  Window,
  blend,
  ellipseOutline,
  heightWithin,
  pointing,
  starOutline,
  type Point2,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/** The paved alley floor, and the kerb along its front. */
const FLOOR = { width: 2.0, depth: 1.3, height: 0.04, kerb: 0.07 }
/** The brick wall along the back: where its face stands, how wide and thick it is, and its coping. */
const WALL = { z: -0.42, width: 1.9, thick: 0.16, coping: 0.06 }
/** The poster on the wall, in its frame; its height follows the picture's shape. */
export const POSTER = { x: -0.44, width: 0.66, frame: 0.03 }
/** The shop window under its striped awning, and the door beside it. */
const SHOP = { x: 0.46, window: [0.5, 0.34] as [number, number], awning: { width: 0.66, reach: 0.3, drop: 0.13, stripes: 8 } }
const DOOR_X = -0.02
/**
 * The rain cloud: its base stands this far under the place's height, its size,
 * and where it hangs: over the right of the wall, Jimothy's side, so its rain
 * falls on him and into the puddle and never across her poster (the alley's
 * test holds it clear).
 */
const CLOUD = { under: 0.6, size: [1.0, 0.56, 0.76] as Vec3, at: [0.38, 0, 0.0] as Vec3 }

/*
 * One colour per material, and each is a draw call once batched (R40), so
 * the darks are shared: `dark` for the mask, eyes, nose, beak and bin bag;
 * `deep` for the paving, the tail's rings and Pidge's wing and tail; the
 * mortar's colour for the kerb; the iron's green for the dumpster's lids. The
 * star is the awning's white.
 */
type Colours = Record<
  'deep' | 'dark' | 'brick' | 'mortar' | 'stone' | 'frame' | 'awning' | 'stripe' | 'iron' | 'bin' | 'disc' | 'fur' | 'furPale' | 'belly' | 'pigeon' | 'neck' | 'feet' | 'door',
  string
>

/** A scalloped edge `width` across, `count` scallops hanging `drop` below a band `band` tall: an awning's valance. */
function valance(width: number, band: number, drop: number, count: number): Point2[] {
  const step = width / count
  const scallops = Array.from({ length: count }, (_, i) =>
    Array.from({ length: 3 }, (_, k) => {
      const t = (k + 0.5) / 3
      const x = width / 2 - (i + t) * step
      return [x, -band - drop * Math.sin(Math.PI * t)] as Point2
    }),
  ).flat()
  return [[-width / 2, 0], [width / 2, 0], [width / 2, -band], ...scallops, [-width / 2, -band]]
}

/**
 * The green-and-white striped awning over the shop window, on a frame: a
 * sloping canopy of alternating stripes, a scalloped valance along its front,
 * and two iron arms from the wall. `at` is the middle of its top edge on the
 * wall; it reaches out toward +Z.
 */
function Awning({ at, colour }: { at: Vec3; colour: Colours }) {
  const { width, reach, drop, stripes } = SHOP.awning
  const slope = Math.atan2(drop, reach)
  const length = Math.hypot(drop, reach)
  const stripe = width / stripes
  return (
    <group position={at}>
      {/* The canopy, tilted down from the wall: one slab per stripe, so the stripes run from the wall to the edge. */}
      <group rotation={[slope, 0, 0]}>
        {Array.from({ length: stripes }, (_, i) => (
          <Block
            key={i}
            size={[stripe + 0.002, 0.018, length]}
            at={[-width / 2 + stripe * (i + 0.5), 0, length / 2]}
            color={i % 2 ? colour.stripe : colour.awning}
            bevel={0.006}
            outline={i === 0 || i === stripes - 1}
          />
        ))}
      </group>
      {/* The valance: the stripes carried on down over a scalloped edge. */}
      <group position={[0, -drop, reach + 0.006]}>
        <Extruded shape={valance(width, 0.04, 0.035, stripes)} depth={0.012} color={colour.awning} bevel={0.004} outline={false} />
        {Array.from({ length: stripes / 2 }, (_, i) => (
          <Block key={i} size={[stripe, 0.04, 0.004]} at={[-width / 2 + stripe * (2 * i + 1.5), -0.02, 0.008]} color={colour.stripe} bevel={0.0015} outline={false} />
        ))}
      </group>
      {/* The frame: an iron arm at each end, from the wall out under the canopy's edge, with a rod across. */}
      {[-1, 1].map((s) => {
        const arm = pointing([s * (width / 2 - 0.02), -0.24, 0.0], [s * (width / 2 - 0.02), -drop - 0.012, reach - 0.01])
        // Thin iron against the canopy's underside: no line of its own.
        return <Tube key={s} at={arm.at} rot={arm.rot} height={arm.length} bottom={0.009} top={0.009} sides={9} bevel={0.004} color={colour.iron} outline={false} />
      })}
      <Tube at={[-width / 2 + 0.02, -drop - 0.012, reach - 0.01]} rot={[0, 0, -Math.PI / 2]} height={width - 0.04} bottom={0.008} top={0.008} sides={9} bevel={0.004} color={colour.iron} outline={false} />
    </group>
  )
}

/**
 * The green dumpster: a tapering bin on small wheels with a rim round its top,
 * two lids, side handles, and on its front a red disc carrying a white star.
 * Built on its foot, facing +Z.
 */
function Dumpster({ at, turn, colour }: { at: Vec3; turn: number; colour: Colours }) {
  const w = 0.52
  const h = 0.36
  const d = 0.32
  const wheel = 0.035
  const base = wheel * 1.6
  return (
    <group position={at} rotation={[0, turn, 0]}>
      {/* Its front wheels (the back ones are hidden under it). */}
      {[-1, 1].map((sx) => (
        <Tube key={sx} at={[sx * (w / 2 - 0.035), wheel, d / 2 - 0.05]} rot={[0, 0, Math.PI / 2]} bottom={wheel} top={wheel} height={0.025} sides={10} bevel={0.006} color={colour.iron} outline={false} />
      ))}
      {/* The bin, with a rim round its top. */}
      <Block size={[w, h, d]} at={[0, base + h / 2, 0]} color={colour.bin} bevel={0.02} />
      <Block size={[w + 0.06, 0.035, d + 0.07]} at={[0, base + h - 0.012, 0]} color={colour.bin} bevel={0.01} />
      {/* Two lids, one shut and one a little open. */}
      <Block size={[w / 2 + 0.02, 0.025, d + 0.08]} at={[-w / 4, base + h + 0.015, 0]} rot={[0, 0, 0.03]} color={colour.iron} bevel={0.008} />
      <Block size={[w / 2 + 0.02, 0.025, d + 0.08]} at={[w / 4, base + h + 0.035, -0.01]} rot={[-0.2, 0, 0]} color={colour.iron} bevel={0.008} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.02, 0.025, 0.12]} at={[s * (w / 2 + 0.035), base + h * 0.7, 0]} color={colour.iron} bevel={0.006} />
      ))}
      {/* The disc on the bin's front, and its star on the disc. */}
      <Extruded shape={ellipseOutline(0.105, 0.105, 20)} depth={0.012} at={[0, base + h * 0.47, d / 2 + 0.005]} color={colour.disc} bevel={0.004} />
      <Extruded shape={starOutline(5, 0.068, 0.029)} depth={0.008} at={[0, base + h * 0.47, d / 2 + 0.014]} color={colour.stripe} bevel={0.003} outline={false} />
    </group>
  )
}

/**
 * Jimothy: a round, fluffy grey raccoon standing on four stubby legs, a paler
 * belly and muzzle, a dark mask across his eyes, a black nose, round ears, and
 * a bushy ringed tail curling up behind him that wags gently. Pidge stands on
 * his head. Built on his feet, facing +Z.
 */
/**
 * Jimothy's build: his round body; his head, smaller, crowning the front of it
 * as in the art, and turned a little off the way his body faces (`turn`), so
 * from the front his long snout and nose show in profile; and his snout,
 * running forward from the head's face to a big nose.
 */
const JIMOTHY = {
  body: { r: 0.215, y: 0.25 },
  head: { r: 0.14, y: 0.475, z: 0.12, turn: -0.45 },
  snout: { length: 0.13, base: 0.052, tip: 0.026, drop: 0.022 },
  nose: 0.03,
}

function Jimothy({ at, turn, colour }: { at: Vec3; turn: number; colour: Colours }) {
  const { body, head } = JIMOTHY
  return (
    <group position={at} rotation={[0, turn, 0]}>
      {/* His front feet, and his hind feet mostly under him (no line of their own). */}
      {[
        [-0.1, 0.1],
        [0.1, 0.1],
        [-0.12, -0.08],
        [0.12, -0.08],
      ].map(([x, z]) => (
        <Blob key={`${x}${z}`} radius={0.05} squash={[1.1, 1.2, 1.25]} at={[x, 0.058, z]} color={colour.fur} outline={z > 0} />
      ))}
      <Tufted radius={body.r} squash={[1.06, 1, 1.02]} tufts={24} depth={0.12} at={[0, body.y, 0]} color={colour.fur} />
      <Blob radius={0.12} squash={[0.95, 1.0, 0.45]} at={[0, body.y - 0.04, body.r * 0.88]} color={colour.belly} outline={false} />
      <group position={[0, head.y, head.z]} rotation={[0, head.turn, 0]}>
        <Head colour={colour} />
      </group>
      <Tail colour={colour} />
    </group>
  )
}

/**
 * Jimothy's head, built round its own middle and facing +Z: round ears pale
 * inside, a dark mask with near-black eyes, a long pale snout tapering to a
 * big glossy black nose, and Pidge standing on top.
 */
function Head({ colour }: { colour: Colours }) {
  const { head, snout } = JIMOTHY
  const face = head.r * 0.9
  const snoutFrom: Vec3 = [0, -0.03, face - 0.06]
  const snoutTo: Vec3 = [0, -0.03 - snout.drop, face + snout.length - 0.06]
  const muzzle = pointing(snoutFrom, snoutTo)
  return (
    <group>
      <Tufted radius={head.r} squash={[1.08, 0.95, 1]} tufts={20} depth={0.12} color={colour.fur} />
      {/* Round ears, pale inside. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Blob radius={0.05} squash={[1, 1, 0.55]} at={[s * 0.1, 0.11, -0.03]} rot={[0, 0, -s * 0.35]} color={colour.fur} />
          <Blob radius={0.03} squash={[1, 1, 0.4]} at={[s * 0.1, 0.11, -0.01]} rot={[0, 0, -s * 0.35]} color={colour.furPale} outline={false} />
        </group>
      ))}
      {/* The mask across his eyes, and his eyes in it, near black with a glint. */}
      <Rounded size={[0.26, 0.095, 0.11]} round={0.8} at={[0, 0.027, face - 0.035]} color={colour.dark} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Blob radius={0.02} squash={[1, 1.05, 0.6]} at={[s * 0.055, 0.03, face + 0.016]} color={colour.dark} />
          <Blob radius={0.006} at={[s * 0.055 - 0.007, 0.038, face + 0.027]} color={colour.furPale} outline={false} />
        </group>
      ))}
      {/* His long pale snout, tapering forward to a big glossy black nose. */}
      <Tube at={muzzle.at} rot={muzzle.rot} height={muzzle.length} bottom={snout.base} top={snout.tip} sides={10} bevel={snout.tip * 0.8} color={colour.furPale} />
      <Blob radius={JIMOTHY.nose} squash={[1.2, 0.9, 0.95]} at={[0, snoutTo[1] + 0.008, snoutTo[2] + 0.004]} color={colour.dark} />
      <Blob radius={0.008} at={[-0.01, snoutTo[1] + 0.024, snoutTo[2] + 0.02]} color={colour.furPale} outline={false} />
      <Pidge at={[0, head.r * 0.93, -0.02]} colour={colour} />
    </group>
  )
}

/**
 * The tail's line, from its root low on his back, sweeping round behind him
 * and rising in a gentle arc by his right side: its joints, and how thick it
 * is at each, bushiest along its middle and tapering to a fine tip, so it
 * reads as one tail rather than a limb.
 */
const TAIL: Array<[Vec3, number]> = [
  [[0.05, 0.14, -0.19], 0.04],
  [[0.14, 0.12, -0.28], 0.055],
  [[0.25, 0.13, -0.29], 0.06],
  [[0.34, 0.17, -0.22], 0.055],
  [[0.39, 0.24, -0.13], 0.042],
  [[0.405, 0.31, -0.06], 0.022],
]

/**
 * Jimothy's bushy tail, ringed light and dark: a ring of tube from each joint
 * to the next, its rounded ends overlapping so it reads as one tail, wagging
 * gently from side to side about its root.
 */
function Tail({ colour }: { colour: Colours }) {
  const [root] = TAIL[0]
  const local = ([x, y, z]: Vec3): Vec3 => [x - root[0], y - root[1], z - root[2]]
  return (
    <Sway at={root} axis="y" amount={0.25} speed={2}>
      {TAIL.slice(1).map(([to, r], i) => {
        const [from, r0] = TAIL[i]
        const ring = pointing(local(from), local(to))
        return <Tube key={i} at={ring.at} rot={ring.rot} height={ring.length + 0.02} bottom={r0} top={r} sides={10} bevel={Math.min(r0, r) * 0.7} color={i % 2 ? colour.deep : colour.fur} />
      })}
      {/* Its rounded tip, as fine as the tail's last ring. */}
      <Blob radius={0.022} at={local([0.406, 0.318, -0.055])} color={colour.fur} />
    </Sway>
  )
}

/**
 * Pidge: a grey pigeon with an iridescent green neck, a darker wing and tail,
 * a small dark beak, an orange eye and pink feet, standing on Jimothy's head.
 * Built on her feet, facing +Z.
 */
function Pidge({ at, colour }: { at: Vec3; colour: Colours }) {
  // Her size: the art's Pidge is nearly half the width of Jimothy's head.
  const k = PIDGE_SIZE
  const p = (x: number, y: number, z: number): Vec3 => [x * k, y * k, z * k]
  return (
    <group position={at} rotation={[0, -0.5, 0]}>
      {[-1, 1].map((s) => (
        <Block key={s} size={p(0.008, 0.03, 0.008)} at={p(s * 0.017, 0.012, 0.004)} color={colour.feet} bevel={0.002 * k} outline={false} />
      ))}
      <Blob radius={0.052 * k} squash={[0.82, 0.78, 1.25]} at={p(0, 0.058, -0.012)} rot={[-0.35, 0, 0]} color={colour.pigeon} />
      <Blob radius={0.04 * k} squash={[0.5, 0.55, 1.3]} at={p(0, 0.07, -0.025)} rot={[-0.3, 0, 0]} color={colour.deep} outline={false} />
      <Block size={p(0.04, 0.012, 0.05)} at={p(0, 0.06, -0.085)} rot={[0.35, 0, 0]} color={colour.deep} bevel={0.004 * k} />
      <Blob radius={0.034 * k} squash={[0.9, 1, 0.9]} at={p(0, 0.098, 0.03)} color={colour.neck} />
      <Blob radius={0.029 * k} at={p(0, 0.128, 0.04)} color={colour.pigeon} />
      <Peak radius={0.008 * k} height={0.022 * k} sides={9} bevel={0.002 * k} at={p(0, 0.124, 0.066)} rot={[Math.PI / 2, 0, 0]} color={colour.dark} />
      {[-1, 1].map((s) => (
        <Blob key={s} radius={0.006 * k} at={p(s * 0.021, 0.134, 0.052)} color={colour.dark} outline={false} />
      ))}
    </group>
  )
}

/** How much larger Pidge is than she was first drawn, to the art's proportion against Jimothy's head. */
const PIDGE_SIZE = 1.4

/** A street lamp on a slim green post: a lit lantern under a small cap. Built on its foot. */
function Lamp({ at, height, colour }: { at: Vec3; height: number; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.08, 0.08, 0.08]} at={[0, 0.04, 0]} color={colour.iron} bevel={0.012} />
      <Tube bottom={0.018} top={0.014} height={height} sides={10} bevel={0.006} color={colour.iron} />
      <Block size={[0.075, 0.025, 0.075]} at={[0, height + 0.0125, 0]} color={colour.iron} bevel={0.006} />
      <Lit size={[0.07, 0.09, 0.07]} at={[0, height + 0.07, 0]} color={landmark.lit} />
      <Peak at={[0, height + 0.115, 0]} radius={0.065} height={0.07} sides={4} bevel={0.006} rot={[0, Math.PI / 4, 0]} color={colour.iron} />
    </group>
  )
}

/**
 * Jimothy & Pidge: Shenanigans in Seattle, a collect-a-thon platformer. Its
 * landmark is the alley from the capsule art, where it always rains: a red
 * brick wall with a stone coping, carrying the game's poster in a frame; a
 * shop window under a green-and-white striped awning on iron arms, and a door
 * beside it; a street lamp; the green dumpster with a white star on a red
 * disc; bin bags; a puddle on the paving; Jimothy, round and fluffy, his
 * ringed tail wagging, with Pidge standing on his head; and over it all the
 * place's weather, a grey cloud raining softly (`Weather`, from
 * `place.weather`).
 *
 * Three levels of detail. The main mass: the wall, the cloud. The secondary
 * forms: the brick courses and coping, the poster's frame, the window, door
 * and awning, the lamp, the dumpster. The props: Jimothy and Pidge, the bin
 * bags, the puddle, the star on its disc.
 *
 * The cloud's top stands at the place's height, from 2.2 to 2.6
 * (`Alley.heights`), and the wall rises with it, keeping clear of the cloud.
 */
export function Alley({ place, district }: ModelProps) {
  const colour: Colours = {
    deep: blend(landmark.slate, landmark.indigo, 0.38),
    dark: blend(landmark.indigo, landmark.slate, 0.2),
    brick: landmark.brick,
    mortar: blend(landmark.stone, landmark.slate, 0.3),
    stone: blend(landmark.stone, landmark.cream, 0.3),
    frame: blend(landmark.wood, landmark.indigo, 0.5),
    awning: blend(landmark.green, landmark.indigo, 0.15),
    stripe: landmark.offWhite,
    iron: blend(blend(landmark.green, landmark.indigo, 0.55), landmark.slate, 0.2),
    bin: blend(landmark.green, landmark.indigo, 0.3),
    disc: landmark.red,
    fur: blend(landmark.slate, landmark.stone, 0.45),
    furPale: blend(landmark.stone, landmark.offWhite, 0.5),
    belly: blend(blend(landmark.slate, landmark.stone, 0.45), landmark.offWhite, 0.45),
    pigeon: blend(landmark.slate, landmark.stone, 0.25),
    neck: blend(landmark.teal, landmark.green, 0.5),
    feet: blend(landmark.pink, landmark.coral, 0.3),
    door: blend(district.color, landmark.indigo, 0.5),
  }
  const height = heightWithin(place.height, Alley.heights)
  const cloudBase = height - CLOUD.under
  // The wall rises with the place, keeping a gap under the cloud.
  const wallTop = Math.min(1.56, cloudBase - 0.3)
  const floor = FLOOR.height
  const wallHigh = wallTop - floor - WALL.coping
  const front = WALL.z + WALL.thick / 2
  // The poster at its own shape (`place.posterSize`), never stretched.
  const posterH = POSTER.width / pictureAspect(place.posterSize)
  const posterY = wallTop - WALL.coping - 0.36
  const windowY = floor + 0.46
  const awningY = windowY + SHOP.window[1] / 2 + 0.17
  const bricksY = floor + 0.08 + (wallHigh - 0.08) / 2

  return (
    <group>
      {/* The paving, a kerb along its front, and a puddle. */}
      <Block size={[FLOOR.width, floor, FLOOR.depth]} at={[0, floor / 2, -0.03]} color={colour.deep} bevel={0.015} />
      <Block size={[FLOOR.width, FLOOR.kerb, 0.08]} at={[0, FLOOR.kerb / 2, FLOOR.depth / 2 - 0.03]} color={colour.mortar} bevel={0.015} />
      <Water shape={ellipseOutline(0.26, 0.13, 24)} at={[-0.18, floor + 0.002, 0.36]} tint={colour.deep} rings={2} />

      {/* The wall: brick courses on a stone plinth, under a stone coping. */}
      <Block size={[WALL.width + 0.04, 0.08, WALL.thick + 0.04]} at={[0, floor + 0.04, WALL.z]} color={colour.stone} bevel={0.015} />
      <Brickwork
        size={[WALL.width, wallHigh - 0.08, WALL.thick]}
        at={[0, bricksY, WALL.z]}
        openings={[
          [POSTER.x, posterY - bricksY, POSTER.width + 2 * POSTER.frame, posterH + 2 * POSTER.frame],
          [SHOP.x, windowY - bricksY, SHOP.window[0] + 0.064, SHOP.window[1] + 0.064],
          [DOOR_X, floor + 0.22 - bricksY, 0.25, 0.44],
        ]}
        brick={[0.12, 0.05]}
        color={colour.brick}
        mortar={colour.mortar}
      />
      <Block size={[WALL.width + 0.08, WALL.coping, WALL.thick + 0.08]} at={[0, wallTop - WALL.coping / 2, WALL.z]} color={colour.stone} bevel={0.015} />

      {/* The game's poster, in a dark frame. */}
      <Block size={[POSTER.width + 2 * POSTER.frame, posterH + 2 * POSTER.frame, 0.03]} at={[POSTER.x, posterY, front + 0.025]} color={colour.frame} bevel={0.008} />
      {place.poster ? <Picture src={place.poster} size={[POSTER.width, posterH]} at={[POSTER.x, posterY, front + 0.042]} /> : null}

      {/* The shop: a window under the striped awning, and a door beside it. */}
      <Window size={SHOP.window} at={[SHOP.x, windowY, front + 0.01]} frame={colour.stone} glass={landmark.lit} />
      <Awning at={[SHOP.x, awningY, front + 0.012]} colour={colour} />
      <Door size={[0.2, 0.42]} at={[DOOR_X, floor, front + 0.01]} color={colour.door} frame={colour.stone} border={0.025} />

      <Lamp at={[0.86, floor, -0.05]} height={1.1} colour={colour} />
      <Dumpster at={[-0.56, floor, -0.13]} turn={0.12} colour={colour} />
      {/* A bin bag left by the dumpster. */}
      <Blob radius={0.085} squash={[1, 0.85, 0.95]} at={[-0.86, floor + 0.08, -0.12]} color={colour.dark} />

      <Jimothy at={[0.2, floor, 0.16]} turn={-0.3} colour={colour} />

      <Weather kind={place.weather} at={[CLOUD.at[0], cloudBase, CLOUD.at[2]]} size={CLOUD.size} fall={cloudBase} />

    </group>
  )
}

/** Its shadow covers the paving. */
Alley.shadow = 1.1
/** The heights it follows: the cloud's top stands at the place's height, the wall rising with it. */
Alley.heights = [2.2, 2.6] as const
