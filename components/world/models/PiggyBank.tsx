'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Drop, Extruded, Ring, Rounded, Tube, Turned, blend, ellipseOutline, flowerOutline, heightWithin, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The pig's body: an ellipsoid of glazed ceramic, [width, height, length], its length along +Z (its face to the front). */
const BODY: Vec3 = [0.74, 0.7, 1.0]
/** The legs: short stubby columns, sunk into the body's underside by `tuck` of their height; a glazed hoof at each foot. */
const LEGS = { height: 0.16, top: 0.072, bottom: 0.08, x: 0.17, z: 0.24, tuck: 0.12, hoof: 0.03 }
/** The snout: a short round column out of the face, `drop` under the body's middle, with two nostrils on its front. */
const SNOUT = { radius: 0.13, length: 0.12, drop: 0.05, sink: 0.05, nostril: [0.02, 0.03] as Point2, apart: 0.045 }
/** The eyes: small dark glazed ovals, a little flattened, `apart` either side and `up` over the body's middle. */
const EYE = { radius: 0.026, squash: [0.75, 1, 0.45] as Vec3, apart: 0.15, up: 0.1 }
/** The ears: broad soft flaps with blunt tips, flopping forward off the top of the head, with a deeper glaze inside. */
const EAR = { width: 0.15, height: 0.13, depth: 0.026, x: 0.18, z: 0.29, lean: 0.35, splay: 0.3, tilt: 0.22, sink: 0.035 }
/** The pig's turn on its pedestal: three-quarters to the front, so its length and its flank show. */
const TURN = 0.55
/** The coin slot on the back: a raised rim of deeper glaze and the dark slot in it, along the pig's width. */
const SLOT = { rim: [0.3, 0.05, 0.11] as Vec3, slot: [0.22, 0.014, 0.03] as Vec3, sink: 0.018 }
/** The curly tail: a small hoop of glaze at the back. */
const TAIL = { radius: 0.04, thickness: 0.016, up: 0.08 }
/** A painted flower on each flank: six rounded petals in the district's colour round a gold heart. */
const FLOWER = { petals: 6, outer: 0.07, inner: 0.03, heart: 0.019, depth: 0.012, up: 0.05, z: 0.2 }
/**
 * A coin, and its drop: it rests just `hover` over the slot's rim (close
 * enough to read as about to drop in, not floating) and falls `fall`, the
 * whole way into the pig, where its body hides it.
 */
const COIN = { radius: 0.08, thick: 0.022, hover: 0.05, fall: 0.27 }
/** The pedestal the pig stands on: a turned wooden plinth, a moulded foot and top round a narrower waist, its height what the place's height leaves. */
const PEDESTAL = { foot: 0.66, waist: 0.48, top: 0.68, felt: 0.6 }
/** The coins on the pedestal beside the pig: two stacks and one lying loose, each coin a little off true. */
const STACKS: Array<{ at: [number, number]; coins: number }> = [
  { at: [-0.38, 0.32], coins: 5 },
  { at: [0.42, -0.28], coins: 3 },
]
const LOOSE: [number, number] = [-0.12, 0.48]
/** The felt's thickness above the pedestal's top: the coins lie on it. */
const FELT = 0.006
const STACK_COIN = { radius: 0.072, thick: 0.024 }

/** The pig's height above the pedestal's top, to the top of the hanging coin. */
const PIG_TALL = LEGS.height - LEGS.tuck + BODY[1] + (SLOT.rim[1] / 2 - SLOT.sink) + COIN.hover + 2 * COIN.radius

type Colours = Record<'glaze' | 'deep' | 'dark' | 'wood' | 'felt' | 'gold' | 'goldDeep' | 'flower', string>

/** Half the body's extents. */
const [A, B, C] = BODY.map((s) => s / 2)

/**
 * The point on the body's surface `x` across and `y` up from its middle, on
 * its front (or back, `side` -1), and the surface's outward normal there.
 */
function onBody(x: number, y: number, side = 1): { at: Vec3; normal: Vec3 } {
  const z = side * C * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (y / B) ** 2))
  const n = [x / (A * A), y / (B * B), z / (C * C)]
  const len = Math.hypot(...n) || 1
  return { at: [x, y, z], normal: n.map((v) => v / len) as Vec3 }
}

/** The turn that faces a part's +Z along `normal`. */
const facing = ([x, y, z]: Vec3): Vec3 => [-Math.atan2(y, Math.hypot(x, z)), Math.atan2(x, z), 0]

/** The body's height over its middle at `x` across and `z` along. */
const topAt = (x: number, z: number) => B * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (z / C) ** 2))

/** A coin lying flat with its foot at `at`, turned `turn` about the upright. */
function FlatCoin({ at, turn, colour }: { at: Vec3; turn: number; colour: Colours }) {
  return <Tube at={at} rot={[0, turn, 0]} top={STACK_COIN.radius} bottom={STACK_COIN.radius} height={STACK_COIN.thick} sides={12} bevel={0.006} color={colour.gold} />
}

/** A stack of `coins` coins standing on `at`, each a little off true. */
function Stack({ at, coins, colour }: { at: Vec3; coins: number; colour: Colours }) {
  return (
    <group position={at}>
      {Array.from({ length: coins }, (_, k) => (
        <FlatCoin key={k} at={[Math.sin(k * 2.3) * 0.008, k * STACK_COIN.thick, Math.cos(k * 1.7) * 0.008]} turn={k * 0.4} colour={colour} />
      ))}
    </group>
  )
}

/** An ear on `side` (-1 left, 1 right), standing at `at` on the top of the head: a soft triangle with a deeper glaze inside. */
function Ear({ side, at, colour }: { side: number; at: Vec3; colour: Colours }) {
  const { width, height, depth } = EAR
  const outer: Point2[] = [[-width / 2, 0], [width / 2, 0], [width * 0.3, height * 0.66], [width * 0.1, height], [-width * 0.1, height], [-width * 0.3, height * 0.66]]
  const inner: Point2[] = outer.map(([x, y]) => [x * 0.6, y * 0.72 + height * 0.06] as Point2)
  return (
    <group position={at} rotation={[EAR.lean, side * EAR.splay, -side * EAR.tilt]}>
      <Extruded shape={outer} depth={depth} color={colour.glaze} bevel={0.008} />
      <Extruded shape={inner} depth={0.008} at={[0, 0, depth / 2 + 0.002]} color={colour.deep} bevel={0.003} outline={false} />
    </group>
  )
}

/**
 * The Budget, a family budgeting app that works by pay period, not by month.
 * Its landmark is a piggy bank: a big, well-made glazed ceramic pig on a
 * turned wooden pedestal, a coin hanging over the slot in its back and
 * dropping into it on a slow loop, with coins stacked beside it.
 *
 * Three levels of detail. The main mass: the pig's body and the pedestal.
 * The secondary forms: the snout, the ears, the legs and their hooves, the
 * slot's rim, the pedestal's mouldings and its felt. The props: the falling coin, the stacks of
 * coins and the loose one, the nostrils and the small dark eyes (a glazed,
 * simple face), the curly tail, a painted flower on each flank.
 *
 * Built from the ground up: the pig's size is its own; the pedestal takes
 * what the place's height leaves under it and the hanging coin, so the
 * coin's top stands at the place's height, from 1.3 to 1.75
 * (`PiggyBank.heights`). The coin falls slowly and smoothly into the slot and
 * reappears above it (`Drop`), resting whole at the top under reduced motion.
 */
export function PiggyBank({ place, district }: ModelProps) {
  const colour: Colours = {
    // A soft pink glaze, warmed toward cream: ceramic, not candy.
    glaze: blend(landmark.pink, landmark.cream, 0.32),
    deep: blend(landmark.pink, landmark.coral, 0.45),
    dark: blend(landmark.indigo, landmark.purple, 0.15),
    wood: landmark.wood,
    // A deep rust felt on the pedestal's top, the district's orange gone dark.
    felt: blend(district.color, landmark.indigo, 0.45),
    gold: landmark.gold,
    goldDeep: blend(landmark.gold, landmark.wood, 0.45),
    flower: district.color,
  }

  const height = heightWithin(place.height, PiggyBank.heights)
  const stand = height - PIG_TALL
  const legTop = stand + LEGS.height
  const cy = legTop - LEGS.tuck + B
  const bodyTop = cy + B
  const rimTop = bodyTop - SLOT.sink + SLOT.rim[1] / 2
  const coinMiddle = rimTop + COIN.hover + COIN.radius

  // A moulded foot, a waist that swells a little and narrows, and an overhanging top: turned wood, not a drum.
  const pedestal: Point2[] = [
    [0, 0],
    [PEDESTAL.foot, 0],
    [PEDESTAL.foot, 0.035],
    [PEDESTAL.foot - 0.07, 0.06],
    [PEDESTAL.waist + 0.04, 0.08],
    [PEDESTAL.waist, 0.1],
    [PEDESTAL.waist - 0.03, stand - 0.09],
    [PEDESTAL.waist + 0.03, stand - 0.07],
    [PEDESTAL.top - 0.04, stand - 0.05],
    [PEDESTAL.top, stand - 0.035],
    [PEDESTAL.top, stand],
    [0, stand],
  ]

  const snoutFoot = onBody(0, -SNOUT.drop).at[2] - SNOUT.sink
  const snoutFront = snoutFoot + SNOUT.length
  const tailBack = onBody(0, TAIL.up, -1).at[2]

  return (
    <group>
      {/* The pedestal, with a round of felt on its top. */}
      <Turned profile={pedestal} sides={24} color={colour.wood} />
      <Tube top={PEDESTAL.felt} bottom={PEDESTAL.felt} height={FELT + 0.004} at={[0, stand - 0.004, 0]} sides={24} bevel={0.004} color={colour.felt} />

      {/* The pig, turned three-quarters to the front. */}
      <group rotation={[0, TURN, 0]}>
      {/* The legs and their hooves, the body on them. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * LEGS.x, stand, sz * LEGS.z]}>
            <Tube top={LEGS.top} bottom={LEGS.bottom} height={LEGS.height} sides={12} bevel={0.02} color={colour.glaze} />
            <Tube top={LEGS.bottom + 0.004} bottom={LEGS.bottom + 0.006} height={LEGS.hoof} sides={12} bevel={0.01} color={colour.deep} outline={false} />
          </group>
        )),
      )}
      <Rounded size={BODY} round={1} at={[0, cy, 0]} color={colour.glaze} />

      {/* The face: the snout and its nostrils, two small dark eyes, the ears. */}
      <Tube at={[0, cy - SNOUT.drop, snoutFoot]} rot={[Math.PI / 2, 0, 0]} top={SNOUT.radius * 0.94} bottom={SNOUT.radius} height={SNOUT.length} bevel={0.03} color={colour.deep} />
      {[-1, 1].map((s) => (
        <Extruded key={s} shape={ellipseOutline(SNOUT.nostril[0], SNOUT.nostril[1], 12)} depth={0.01} at={[s * SNOUT.apart, cy - SNOUT.drop, snoutFront + 0.002]} color={colour.dark} outline={false} />
      ))}
      {[-1, 1].map((s) => {
        const { at, normal } = onBody(s * EYE.apart, EYE.up)
        return (
          <Blob
            key={s}
            radius={EYE.radius}
            squash={EYE.squash}
            at={[at[0] + normal[0] * 0.004, cy + at[1] + normal[1] * 0.004, at[2] + normal[2] * 0.004]}
            rot={facing(normal)}
            color={colour.dark}
            outline={false}
          />
        )
      })}
      {[-1, 1].map((s) => (
        <Ear key={s} side={s} at={[s * EAR.x, cy + topAt(EAR.x, EAR.z) - EAR.sink, EAR.z]} colour={colour} />
      ))}

      {/* A painted flower on each flank. */}
      {[-1, 1].map((s) => {
        // On the flank toward the face, so the turned pig shows the near one to the front.
        const x = s * A * Math.sqrt(Math.max(0, 1 - (FLOWER.up / B) ** 2 - (FLOWER.z / C) ** 2))
        const n: Vec3 = [x / (A * A), FLOWER.up / (B * B), FLOWER.z / (C * C)]
        const len = Math.hypot(...n)
        const normal = n.map((v) => v / len) as Vec3
        return (
          <group key={s} position={[x + normal[0] * 0.004, cy + FLOWER.up + normal[1] * 0.004, FLOWER.z + normal[2] * 0.004]} rotation={facing(normal)}>
            <Extruded shape={flowerOutline(FLOWER.petals, FLOWER.outer, FLOWER.inner)} depth={FLOWER.depth} color={colour.flower} bevel={0.004} outline={false} />
            <Blob radius={FLOWER.heart} at={[0, 0, FLOWER.depth / 2 + 0.004]} color={colour.gold} outline={false} />
          </group>
        )
      })}

      {/* The curly tail. */}
      <Ring radius={TAIL.radius} thickness={TAIL.thickness} sides={6} around={16} at={[0, cy + TAIL.up, tailBack - TAIL.radius * 0.8]} rot={[0, 0.6, Math.PI / 2]} color={colour.glaze} />

      {/* The slot in the back, and the coin dropping into it. */}
      <Rounded size={SLOT.rim} round={0.5} at={[0, bodyTop - SLOT.sink, 0]} color={colour.deep} />
      <Block size={SLOT.slot} bevel={0.005} at={[0, rimTop - SLOT.slot[1] / 2 + 0.004, 0]} color={colour.dark} outline={false} />
      <Drop at={[0, coinMiddle, 0]} fall={COIN.fall}>
        <Tube at={[0, 0, -COIN.thick / 2]} rot={[Math.PI / 2, 0, 0]} top={COIN.radius} bottom={COIN.radius} height={COIN.thick} sides={20} bevel={0.007} color={colour.gold} />
        <Ring radius={COIN.radius * 0.72} thickness={0.009} sides={6} around={20} at={[0, 0, COIN.thick / 2]} rot={[Math.PI / 2, 0, 0]} color={colour.goldDeep} outline={false} />
      </Drop>
      </group>

      {/* Coins beside the pig: two stacks and a loose one. */}
      {STACKS.map(({ at: [x, z], coins }) => (
        <Stack key={x} at={[x, stand + FELT, z]} coins={coins} colour={colour} />
      ))}
      <FlatCoin at={[LOOSE[0], stand + FELT, LOOSE[1]]} turn={0.3} colour={colour} />
    </group>
  )
}

/** Its shadow covers the pedestal. */
PiggyBank.shadow = 0.95
/** The heights it follows: the pedestal takes what the pig and its hanging coin leave. */
PiggyBank.heights = [1.3, 1.75] as const
