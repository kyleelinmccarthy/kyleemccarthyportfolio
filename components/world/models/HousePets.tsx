'use client'

import type { ReactNode } from 'react'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { landmark } from '@/content/sky'
import { Blob, Block, Extruded, Sway, Tufted, blend, pointing, type Point2, type Vec3 } from './kit'

/*
 * The owner's five pets, who live in the House's garden: two dogs and three
 * cats, each built round its feet facing +Z and placed by `House`. Every
 * colour is a draw call once batched, so they share where they can: the white
 * is the trim's off-white and the black the palette's indigo (the eyes'
 * colour) on every animal that wears them, and the senior cat's eyes borrow
 * colours the garden already uses.
 */
/** White fur: all of the large dog; the two black-and-white cats' white; the medium dog's chest, face and legs; the kitten's paws. The trim's off-white. */
const WHITE = landmark.offWhite
/** Black fur: the cats' mask, ears, spot, swirl and tails, the large dog's nose, and every pet's eyes but the senior cat's. */
const BLACK = landmark.indigo
/** The medium dog's red merle: a deep reddish brown… */
const MERLE = blend(blend(landmark.brick, landmark.wood, 0.2), landmark.indigo, 0.12)
/** …mottled with patches of darker liver red… */
const MERLE_DARK = blend(landmark.brick, landmark.indigo, 0.52)
/** …and of pale copper. */
const MERLE_PALE = blend(landmark.brick, landmark.sand, 0.55)
/** The kitten's long brown-grey tabby coat… */
const TABBY = blend(landmark.wood, landmark.slate, 0.5)
/** …and its darker stripes. */
const TABBY_STRIPE = blend(TABBY, landmark.indigo, 0.45)
/** The senior cat's eye: green (the garden's leaf), so it shows on her black mask. */
const CAT_EYE = landmark.green
/** Her closed right eye's lid line: a pale grey that shows on black fur (the pond's kerb). */
const LID = blend(landmark.slate, landmark.stone, 0.3)
/** The cats' and the medium dog's noses. */
const NOSE = blend(landmark.pink, landmark.indigo, 0.35)

/* ───────────── placing parts on a body ───────────── */

/** A ball a part is placed on: a `Blob`'s middle, radius and squash (unturned). */
type Ball = { at: Vec3; radius: number; squash: Vec3 }

const axesOf = (ball: Ball) => ball.squash.map((s) => s * ball.radius) as Vec3
/** The height of a ball's top. */
const topOf = (ball: Ball) => ball.at[1] + axesOf(ball)[1]

/** The height of a ball's upper surface `x` across and `dz` forward of its middle. */
function topAt(ball: Ball, x: number, dz: number): number {
  const [a, b, c] = axesOf(ball)
  return ball.at[1] + b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (dz / c) ** 2))
}

/**
 * Where a small part sits on the front (+Z) of `ball`, `x` across and `up`
 * above its middle, sunk `sink` along the surface's normal, and the turn that
 * faces the part's +Z out along that normal: an eye, a nose.
 */
function onFront(ball: Ball, x: number, up: number, sink = 0): { at: Vec3; rot: Vec3 } {
  const [a, b, c] = axesOf(ball)
  const z = c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (up / b) ** 2))
  const normal = new Vector3(x / (a * a), up / (b * b), z / (c * c)).normalize()
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal))
  const at = new Vector3(x, up, z).addScaledVector(normal, -sink).add(new Vector3(...ball.at))
  return { at: at.toArray() as Vec3, rot: [turn.x, turn.y, turn.z] }
}

/**
 * A marking laid on `ball`: a flattened `Blob` `size` [length, thickness,
 * width] whose middle stands on the ball's surface toward `toward` (from the
 * ball's middle), lying along it with its length toward `along`, sunk so that
 * it stands only `proud` out of it. The ball's surface cuts the marking's edge,
 * so it reads as a patch of colour in the coat, neither floating on it nor
 * buried in it (its thickness must be at least its length squared over the
 * ball's radius there, or its ends would lift).
 */
function laid(ball: Ball, toward: Vec3, along: Vec3, size: Vec3, proud = 0.0025) {
  const [a, b, c] = axesOf(ball)
  const d = new Vector3(...toward)
  const onSurface = d.multiplyScalar(1 / Math.hypot(d.x / a, d.y / b, d.z / c))
  const normal = new Vector3(onSurface.x / (a * a), onSurface.y / (b * b), onSurface.z / (c * c)).normalize()
  const x = new Vector3(...along).projectOnPlane(normal).normalize()
  const z = new Vector3().crossVectors(x, normal)
  const turn = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, normal, z))
  const at = onSurface.addScaledVector(normal, proud - size[1]).add(new Vector3(...ball.at))
  return { at: at.toArray() as Vec3, rot: [turn.x, turn.y, turn.z] as Vec3, radius: size[0], squash: [1, size[1] / size[0], size[2] / size[0]] as Vec3 }
}

/** The point on `ball`'s surface `azimuth` round from its front toward +X (radians) and `height` of the way from its middle to its top (−1 to 1), from its middle. */
function aroundBall(ball: Ball, azimuth: number, height: number): Vec3 {
  const [a, b, c] = axesOf(ball)
  const ring = Math.sqrt(Math.max(0, 1 - height * height))
  return [a * Math.sin(azimuth) * ring, b * height, c * Math.cos(azimuth) * ring]
}

/** A round limb or tail segment `r` thick from `from` to `to`, as a `Blob` stretched along it (its rounded ends overlapping the next). */
function limb(from: Vec3, to: Vec3, r: number) {
  const { rot, length } = pointing(from, to)
  return { at: from.map((v, i) => (v + to[i]) / 2) as Vec3, rot, radius: r, squash: [1, (length / 2 + r * 0.5) / r, 1] as Vec3 }
}

/* ───────────── heads and faces ───────────── */

/** A pointed ear: a thin square turned on its corner, its lower half set into the head, so a triangle stands above it. */
function PointedEar({ at, side, size, color, splay = 0.22 }: { at: Vec3; side: number; size: number; color: string; splay?: number }) {
  return <Block size={[size, size, size * 0.34]} bevel={size * 0.14} at={at} rot={[-0.12, side * 0.25, Math.PI / 4 - side * splay]} color={color} />
}

type Ears = { kind: 'pointed'; size: number; color: string; x: number; back: number } | { kind: 'drop'; radius: number; color: string }

/**
 * A head and its simple face, every part placed from the head: the head
 * itself; a muzzle standing out of its front, for a dog; a nose on the
 * muzzle's front or the head's; two small dark eyes on its front (or the
 * cat's own, `eyes`); pointed ears standing on its top or soft ears hanging
 * at its sides; and, under a dog's head, a neck in its coat with no line of
 * its own, so the head's line does not read as a collar where it meets the
 * chest. Its markings come as `children`.
 */
function Head({
  head,
  coat,
  ears,
  eyes,
  eye,
  nose,
  muzzle,
  neck,
  children,
}: {
  head: Ball
  coat: string
  ears: Ears
  /** The eyes, when they are not the usual two dark ones. */
  eyes?: ReactNode
  /** The usual eyes: how far either side of the middle, how far up, their size. */
  eye?: { x: number; up: number; size: Vec3 }
  nose: { up: number; size: Vec3; color: string }
  muzzle?: { up: number; radius: number; squash: Vec3; color: string }
  /** The neck's ball, under the head. */
  neck?: Ball
  children?: ReactNode
}) {
  const [hx, hy, hz] = head.at
  const [ha] = axesOf(head)
  // A dog's muzzle stands out of the head's front by two thirds of its length.
  const muzzleBall: Ball | null = muzzle
    ? (() => {
        const front = onFront(head, 0, muzzle.up).at
        return { at: [hx, front[1], front[2] - muzzle.radius * muzzle.squash[2] * 0.35] as Vec3, radius: muzzle.radius, squash: muzzle.squash }
      })()
    : null
  const nosePlace = onFront(muzzleBall ?? head, 0, muzzleBall ? nose.up - (muzzleBall.at[1] - hy) : nose.up, nose.size[2] * 0.3)
  return (
    <>
      {neck && <Blob {...neck} color={coat} outline={false} />}
      <Blob {...head} color={coat} />
      {muzzle && muzzleBall && <Blob {...muzzleBall} color={muzzle.color} />}
      <Block size={nose.size} bevel={nose.size[1] * 0.35} {...nosePlace} color={nose.color} outline={false} />
      {eyes ??
        (eye &&
          [-1, 1].map((s) => <Block key={s} size={eye.size} bevel={eye.size[1] * 0.3} {...onFront(head, s * eye.x, eye.up, eye.size[2] * 0.3)} color={BLACK} outline={false} />))}
      {ears.kind === 'pointed'
        ? [-1, 1].map((s) => (
            <PointedEar key={s} side={s} size={ears.size} at={[hx + s * ears.x, topAt(head, ears.x, ears.back) + ears.size * 0.1, hz + ears.back]} color={ears.color} />
          ))
        : [-1, 1].map((s) => <Blob key={s} radius={ears.radius} squash={[0.38, 1, 0.8]} at={[hx + s * ha, hy - 0.003, hz - 0.01]} rot={[0.1, 0, s * 0.35]} color={ears.color} />)}
      {children}
    </>
  )
}

/* ───────────── the cats ───────────── */

/** A cat's tail: its joints from its root in its body to its tip (in an adult cat's measure), how thick it is at the root, its colour and its tip's, and whether its last two segments swish (from the joint before them). */
type Tail = { path: Vec3[]; radius: number; color: string; tip?: string; twitch?: boolean }

/** A sitting cat, as `Cat` builds it: where it is, its size against a grown cat (1), its coat, ears, paws, tail, face and markings. */
type CatSpec = {
  name: string
  at: Vec3
  turn: number
  size: number
  coat: string
  ears: string
  paws: string
  tail: Tail
  /** Its body is long fur: tufted rather than smooth. */
  fluffy?: boolean
  /** Its eyes, when they are not the usual dark ones: from its head. */
  eyes?: (head: Ball) => ReactNode
  /** Its markings: from its body and head. */
  markings?: (body: Ball, head: Ball) => ReactNode
}

/** A sitting cat's body (haunches and chest in one pear) and head, at `k` times a grown cat's size: the head stands on the body's top. */
function catBalls(k: number): { body: Ball; head: Ball } {
  const body: Ball = { at: [0, 0.0483 * k, 0], radius: 0.034 * k, squash: [1.03, 1.42, 1.08] }
  const headSquash: Vec3 = [1.08, 0.95, 0.95]
  const headRadius = 0.029 * k
  const head: Ball = { at: [0, topOf(body) + headRadius * headSquash[1] * 0.55, 0.016 * k], radius: headRadius, squash: headSquash }
  return { body, head }
}

/**
 * A cat sitting up: a pear of a body on the ground, two forepaws in front, a
 * head on its top with pointed ears, eyes and a pink nose, and a tail of
 * tapering segments along `tail.path`, its tip in its own colour, its end
 * twitching in a `Sway` if it says so. Named `pet:<name>` so the House's test
 * can find it. Built round its feet, facing +Z.
 */
function Cat({ name, at, turn, size: k, coat, ears, paws, tail, fluffy, eyes, markings }: CatSpec) {
  const { body, head } = catBalls(k)
  const joints = tail.path.map((p) => p.map((v) => v * k) as Vec3)
  const segments = joints.slice(1).map((to, i) => ({ from: joints[i], to, r: tail.radius * k * (1 - (0.3 * i) / Math.max(1, joints.length - 2)) }))
  const last = segments.length - 1
  const colourOf = (i: number) => (i === last && tail.tip ? tail.tip : tail.color)
  const still = tail.twitch ? segments.slice(0, -2) : segments
  const moving = tail.twitch ? segments.slice(-2) : []
  const pivot = moving[0]?.from ?? [0, 0, 0]
  const local = (p: Vec3) => p.map((v, i) => v - pivot[i]) as Vec3
  return (
    <group name={`pet:${name}`} position={at} rotation={[0, turn, 0]}>
      {fluffy ? <Tufted {...body} tufts={6} depth={0.3} color={coat} /> : <Blob {...body} color={coat} />}
      {[-1, 1].map((s) => (
        <Blob key={s} radius={0.009 * k} squash={[1, 0.7, 1.4]} at={[s * 0.012 * k, 0.0063 * k, 0.03 * k]} color={paws} outline={false} />
      ))}
      <Head
        head={head}
        coat={coat}
        ears={{ kind: 'pointed', size: 0.021 * k, color: ears, x: 0.018 * k, back: -0.004 * k }}
        eyes={eyes?.(head)}
        eye={{ x: 0.0125 * k, up: 0.0065 * k, size: [0.009 * k, 0.0065 * k, 0.005 * k] }}
        nose={{ up: -0.0015 * k, size: [0.008 * k, 0.006 * k, 0.006 * k], color: NOSE }}
      >
        {markings?.(body, head)}
      </Head>
      {still.map(({ from, to, r }, i) => (
        <Blob key={i} {...limb(from, to, r)} color={colourOf(i)} />
      ))}
      {moving.length > 0 && (
        <Sway at={pivot} axis="y" amount={0.3} speed={2.2}>
          {moving.map(({ from, to, r }, i) => (
            <Blob key={i} {...limb(local(from), local(to), r)} color={colourOf(still.length + i)} />
          ))}
        </Sway>
      )}
    </group>
  )
}

/** The arc of the senior cat's closed eyelid, as seen from the front: a thin curve dipping in the middle, as wide as her open eye, round its middle. */
function lidOutline(width: number, line: number, dip: number): Point2[] {
  const steps = 6
  // The curve's middle line: level at its ends, `dip` lower in the middle, centred on y = 0.
  const curve = (t: number): Point2 => {
    const x = (t - 0.5) * width
    return [x, dip / 2 - dip * (1 - ((2 * x) / width) ** 2)]
  }
  const ts = Array.from({ length: steps + 1 }, (_, i) => i / steps)
  // Anticlockwise: along its lower edge left to right, back along its upper edge.
  const lower = ts.map((t) => curve(t)).map(([x, y]) => [x, y - line / 2] as Point2)
  const upper = [...ts].reverse().map((t) => curve(t)).map(([x, y]) => [x, y + line / 2] as Point2)
  return [...lower, ...upper]
}

/**
 * The senior cat, thirteen years old, sitting calmly: white, with black ears
 * and a black mask over the top of her head and her eyes, as if she wore a
 * Batman cowl, a large black spot on her side and a black tail wrapped round
 * her right side and across the front of her paws. She is missing her right eye: where it was, a soft closed lid
 * line, as if she were resting it; her left is open and green. Her right is
 * the viewer's left.
 */
export function MaskCat({ at, turn }: { at: Vec3; turn: number }) {
  const cap = (head: Ball): Ball => ({ at: [head.at[0], head.at[1] + 0.0085, head.at[2] + 0.003], radius: 0.0325, squash: [1, 0.646, 0.898] })
  return (
    <Cat
      name="maskCat"
      at={at}
      turn={turn}
      size={1}
      coat={WHITE}
      ears={BLACK}
      paws={WHITE}
      tail={{ path: [[-0.006, 0.02, -0.028], [-0.04, 0.0075, 0.028], [0.008, 0.0072, 0.054]], radius: 0.0078, color: BLACK }}
      eyes={(head) => {
        // Her eyes sit on the mask, which stands just in front of her head at their height.
        const mask = cap(head)
        return (
          <>
            <Block size={[0.009, 0.0065, 0.005]} bevel={0.002} {...onFront(mask, 0.0125, 0.0005, 0.0015)} color={CAT_EYE} outline={false} />
            <Extruded shape={lidOutline(0.009, 0.0014, 0.0022)} depth={0.0016} bevel={0.0004} {...onFront(mask, -0.0125, 0.0005, 0.0002)} color={LID} outline={false} />
          </>
        )
      }}
      markings={(body, head) => (
        <>
          {/* The mask: a black cap over the top of her head, down over her eyes; her muzzle and chin white below it. */}
          <Blob {...cap(head)} color={BLACK} />
          <Blob {...laid(body, [-1, 0.25, 0.3], [0, 1, 0], [0.028, 0.024, 0.024])} color={BLACK} outline={false} />
        </>
      )}
    />
  )
}

/**
 * The swirl on the young cat's back: a thick black band, thin where it starts
 * up on his spine and widening as it runs down his back, round under the
 * middle of his right side and up again, then curling in to end blunt and
 * round, so it suggests a G. Each point is [round from his front toward his
 * left (radians; his right side is −π/2, his spine −π), height on his body
 * (−1 to 1), the band's half-width]. Uneven on purpose: fur, not type.
 */
const SWIRL: Array<[number, number, number]> = [
  [-3.1, 0.9, 0.0026],
  [-2.82, 0.56, 0.0036],
  [-2.5, 0.16, 0.0046],
  [-1.95, 0.02, 0.0056],
  [-1.57, 0.28, 0.0064],
  [-1.8, 0.5, 0.007],
  [-2.15, 0.4, 0.0085],
]

/** The swirl laid on `body`: a band from each point of `SWIRL` to the next along its surface, the last running on past its point to end round and blunt. */
function Swirl({ body }: { body: Ball }) {
  const points = SWIRL.map(([azimuth, height]) => new Vector3(...aroundBall(body, azimuth, height)))
  const last = points.length - 2
  return (
    <>
      {points.slice(1).map((to, i) => {
        const from = points[i]
        const width = (SWIRL[i][2] + SWIRL[i + 1][2]) / 2
        const mid = from.clone().add(to).multiplyScalar(0.5)
        const half = from.distanceTo(to) / 2 + width * (i === last ? 1 : 0.6)
        return <Blob key={i} {...laid(body, mid.toArray() as Vec3, to.clone().sub(from).toArray() as Vec3, [half, 0.007, width], 0.002)} color={BLACK} outline={false} />
      })}
    </>
  )
}

/**
 * The young cat, a year and a half old, sitting at the pond's edge watching
 * the koi: white, with white ears, a black swirl like a G on his back, and a
 * black tail lying out on the grass toward the visitor, clear of his paws,
 * with a white tip, swishing a little.
 */
export function SwirlCat({ at, turn }: { at: Vec3; turn: number }) {
  return (
    <Cat
      name="swirlCat"
      at={at}
      turn={turn}
      size={1}
      coat={WHITE}
      ears={WHITE}
      paws={WHITE}
      tail={{ path: [[0, 0.024, -0.027], [-0.07, 0.0075, -0.035], [-0.09, 0.016, 0.008]], radius: 0.0078, color: BLACK, tip: WHITE, twitch: true }}
      markings={(body) => <Swirl body={body} />}
    />
  )
}

/**
 * The kitten, six months old and the smallest of the five, sitting: long
 * brown-grey tabby fur (a tufted body, broad cheeks), a hint of darker stripes
 * on its forehead, white front paws, and a thick bushy tail curling up its
 * side, darker at the end.
 */
export function Kitten({ at, turn }: { at: Vec3; turn: number }) {
  return (
    <Cat
      name="kitten"
      at={at}
      turn={turn}
      size={0.62}
      coat={TABBY}
      ears={TABBY}
      paws={WHITE}
      fluffy
      tail={{ path: [[0.006, 0.022, -0.03], [0.044, 0.018, -0.02], [0.056, 0.052, -0.008]], radius: 0.018, color: TABBY, tip: TABBY_STRIPE }}
      markings={(_, head) => (
        <>
          {[-0.3, 0.3].map((x) => (
            <Blob key={x} {...laid(head, [x, 0.75, 0.6], [0, 1, 0], [0.0075, 0.0048, 0.0025], 0.0015)} color={TABBY_STRIPE} outline={false} />
          ))}
        </>
      )}
    />
  )
}

/* ───────────── the dogs ───────────── */

/** The large dog's haunches, its deep chest (leaning forward to its shoulders), and its head on the chest's top. */
const LARGE_DOG = (() => {
  const rump: Ball = { at: [0, 0.05, -0.035], radius: 0.06, squash: [1.05, 0.84, 1.05] }
  const chest = { at: [0, 0.125, 0] as Vec3, radius: 0.05, squash: [0.95, 1.3, 0.92] as Vec3, lean: 0.35 }
  // The chest's top, leaning forward with it.
  const reach = chest.radius * chest.squash[1]
  const shoulders: Vec3 = [0, chest.at[1] + reach * Math.cos(chest.lean), chest.at[2] + reach * Math.sin(chest.lean)]
  const head: Ball = { at: [0, shoulders[1] + 0.03, shoulders[2] + 0.018], radius: 0.043, squash: [1, 0.95, 1] }
  const neck: Ball = { at: [0, shoulders[1] + 0.004, shoulders[2] + 0.006], radius: 0.034, squash: [1, 0.9, 1] }
  return { rump, chest, head, neck }
})()

/**
 * The large dog, a short-haired Great Pyrenees and mini Australian shepherd
 * cross, all white and much the biggest of the five, sitting up like a
 * guardian: broad haunches on the ground, a deep chest leaning forward to the
 * shoulders, straight forelegs on broad paws, a broad head with a medium
 * muzzle, a black nose and dark eyes, soft ears folded down at its sides, and
 * its plume of a tail lying on the grass, sweeping it as it wags.
 */
export function LargeDog({ at, turn }: { at: Vec3; turn: number }) {
  const { rump, chest, head, neck } = LARGE_DOG
  return (
    <group name="pet:largeDog" position={at} rotation={[0, turn, 0]}>
      <Blob {...rump} color={WHITE} />
      <Blob radius={chest.radius} squash={chest.squash} at={chest.at} rot={[chest.lean, 0, 0]} color={WHITE} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block size={[0.026, 0.11, 0.028]} bevel={0.012} at={[s * 0.024, 0.055, 0.03]} color={WHITE} />
          <Blob radius={0.017} squash={[1, 0.65, 1.4]} at={[s * 0.024, 0.011, 0.05]} color={WHITE} outline={false} />
        </group>
      ))}
      <Head
        head={head}
        coat={WHITE}
        neck={neck}
        ears={{ kind: 'drop', radius: 0.025, color: WHITE }}
        eye={{ x: 0.017, up: 0.011, size: [0.009, 0.007, 0.005] }}
        muzzle={{ up: -0.015, radius: 0.024, squash: [0.85, 0.72, 1.25], color: WHITE }}
        nose={{ up: -0.008, size: [0.015, 0.011, 0.012], color: BLACK }}
      />
      {/* Its tail, from low on its haunches out to its left along the grass, wagging. */}
      <Sway at={[0.03, 0.016, -0.085]} axis="y" amount={0.35} speed={3}>
        <Blob radius={0.016} squash={[1, 0.9, 3.6]} at={[0.045, 0, -0.02]} rot={[0, 1.99, 0]} color={WHITE} />
      </Sway>
    </group>
  )
}

/**
 * The medium dog's build, short and sturdy: thick legs `leg` tall, a deep
 * chest and a smaller rump standing on them, and its head on the chest's top.
 * (No neck: on this dog the head's line that reads as a collar is along its
 * side, where a neck under it does not reach.)
 */
const MEDIUM_DOG = (() => {
  const leg = { height: 0.042, width: 0.03 }
  const chest: Ball = { at: [0, 0.078, 0.03], radius: 0.045, squash: [1, 0.95, 1.05] }
  const rump: Ball = { at: [0, 0.074, -0.035], radius: 0.04, squash: [1, 0.95, 1.15] }
  const head: Ball = { at: [0, topOf(chest) + 0.012, 0.072], radius: 0.033, squash: [1.08, 0.95, 1] }
  return { leg, chest, rump, head }
})()

/**
 * The medium dog, a mini Australian shepherd, French bulldog and heeler
 * cross, about half the large dog's bulk, sturdy and short in the leg,
 * standing: a deep red merle coat, mottled with darker liver and paler copper
 * patches, white on its chest, its legs, its muzzle and a blaze up its face,
 * upright ears, a liver nose, and a tail held out and down behind.
 */
export function MediumDog({ at, turn }: { at: Vec3; turn: number }) {
  const { leg, chest, rump, head } = MEDIUM_DOG
  return (
    <group name="pet:mediumDog" position={at} rotation={[0, turn, 0]}>
      {[0.04, -0.045].flatMap((z) =>
        [-1, 1].map((s) => <Block key={`${z}${s}`} size={[leg.width, leg.height, leg.width]} bevel={0.012} at={[s * 0.024, leg.height / 2, z]} color={WHITE} />),
      )}
      <Blob {...chest} color={MERLE} />
      <Blob {...rump} color={MERLE} />
      <Blob {...laid(chest, [0, -0.2, 1], [0, 1, 0], [0.03, 0.02, 0.026])} color={WHITE} outline={false} />
      {/* The merle: darker liver and paler copper patches on its right, which the visitor sees, and over its back. */}
      <Blob {...laid(rump, [-1, 0.4, -0.1], [0, 0, 1], [0.034, 0.03, 0.026])} color={MERLE_DARK} outline={false} />
      <Blob {...laid(chest, [-0.7, 0.75, 0.2], [0, 0, 1], [0.018, 0.012, 0.014])} color={MERLE_DARK} outline={false} />
      <Blob {...laid(chest, [-1, 0.5, -0.1], [0, 0, 1], [0.022, 0.016, 0.018])} color={MERLE_PALE} outline={false} />
      <Blob {...laid(rump, [-0.6, 0.85, 0.3], [0, 0, 1], [0.018, 0.012, 0.014])} color={MERLE_PALE} outline={false} />
      <Head
        head={head}
        coat={MERLE}
        ears={{ kind: 'pointed', size: 0.024, color: MERLE, x: 0.02, back: -0.01 }}
        eye={{ x: 0.015, up: 0.008, size: [0.008, 0.006, 0.004] }}
        muzzle={{ up: -0.01, radius: 0.017, squash: [0.95, 0.8, 1.15], color: WHITE }}
        nose={{ up: -0.005, size: [0.012, 0.009, 0.01], color: NOSE }}
      >
        <Blob {...laid(head, [0, 0.55, 1], [0, 1, 0], [0.017, 0.01, 0.0065])} color={WHITE} outline={false} />
      </Head>
      <Blob {...limb([0, 0.088, -0.07], [0, 0.06, -0.125], 0.0105)} color={MERLE} />
    </group>
  )
}
