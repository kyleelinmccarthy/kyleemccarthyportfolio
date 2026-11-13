'use client'

import type { Look } from '@/content/characters'
import { landmark, people } from '@/content/sky'
import { FACE_ROUND, HEAD_ROUND, TORSO_ROUND, armPose, figureOf, onRounded, plus, type Figure, type Limb, type Part } from '@/lib/world/figure'
import { CROWN, longWaves } from '@/lib/world/hair'
import { Blob, Block, Extruded, Ring, Rod, Rounded, Sway, Swept, Tube, Turned, Tufted, blend, bowOutline, pointing, smileOutline, type Point2, type Vec3 } from './kit'

/*
 * One builder for every person on the planet: the guide (Kylee) and the
 * visitor's character in whichever look they choose. It takes a look (a
 * description: build, height, skin, hair, clothes, an accessory;
 * `content/characters.ts`) and draws the figure from kit parts, in the
 * landmarks' cel-shaded look, standing on its feet facing +Z, its weight on
 * its right leg. The proportions are pure (`figureOf` in lib/world/figure.ts);
 * this only draws.
 *
 * Every colour is a draw call once batched, so a figure keeps to a few: its
 * skin, hair, clothes, the dark of its eyes and mouth, and what it wears.
 */

/** A figure's colours, from its look. */
interface Colours {
  skin: string
  hair: string
  streaks: string
  beard: string
  top: string
  under: string
  pattern: string
  bottom: string
  shoes: string
  belt: string
  buckle: string
  accessory: string
  ring: string
  /** The eyes' colour round the pupil, or none for dark eyes. */
  iris: string | null
  /** The pupils: the palette's indigo, as every character's eyes on the planet. */
  eye: string
  /** The mouth: the skin taken toward indigo. */
  mouth: string
}

function coloursOf(look: Look): Colours {
  const skin = people.skin[look.skin]
  const hair = people.hair[look.hair.color]
  const top = people.cloth[look.top.color]
  return {
    skin,
    hair,
    streaks: look.hair.streaks ? people.hair[look.hair.streaks] : hair,
    beard: look.beard ? people.hair[look.beard] : hair,
    top,
    under: look.top.under ? people.cloth[look.top.under] : top,
    pattern: look.top.pattern ? people.cloth[look.top.pattern.color] : top,
    bottom: people.cloth[look.bottom.color],
    shoes: people.cloth[look.shoes.color],
    belt: look.belt ? people.cloth[look.belt.color] : people.cloth.ink,
    buckle: look.belt ? people.cloth[look.belt.buckle] : people.cloth.silver,
    accessory: look.accessoryColor ? people.cloth[look.accessoryColor] : top,
    ring: look.noseRing ? people.cloth[look.noseRing] : people.cloth.silver,
    iris: look.eyes ? people.eyes[look.eyes] : null,
    eye: landmark.indigo,
    mouth: blend(skin, landmark.indigo, 0.5),
  }
}

/** How far the head tips back, in radians. */
const HEAD_TILT = 0.08

/** How many sides a lock of hair has, and it is laid in two steps between each of its path's points: locks are many, and each is a few pixels across in the world. */
const LOCK_SIDES = 6

/** How many sides a limb has: still smooth (more than 8), and no more, for a part a few pixels across in the world. */
const LIMB_SIDES = 9

/*
 * At a place a character is about seventy pixels tall, so a line round a part
 * that sits wholly inside the figure's silhouette (the waist, the hips, a
 * cuff, the face set into the head) is less than a pixel and never seen: those
 * parts draw none, which pays for the hair.
 */

/** A limb tapering from one end to the other (`pointing` lays it). */
function Taper({ from, to, top, bottom, color, outline = true }: Limb & { color: string; outline?: boolean }) {
  const { at, rot, length } = pointing(from, to)
  if (!(length > 0)) return null
  // A tube's `bottom` is at `from`.
  return <Tube at={at} rot={rot} height={length} bottom={top} top={bottom} sides={LIMB_SIDES} bevel={Math.min(top, bottom) * 0.5} color={color} outline={outline} />
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** A soft part of the body. */
const Soft = ({ part, color, outline }: { part: Part; color: string; outline?: boolean }) => <Rounded size={part.size} round={TORSO_ROUND} at={part.at} color={color} outline={outline} />

/* ───────────── legs and feet ───────────── */

/** A shoe or boot under the ankle at `ankle`. Boots have a heel and a shaft over the ankle. */
function Foot({ ankle, f, look, c }: { ankle: Vec3; f: Figure; look: Look; c: Colours }) {
  const [w, h, l] = f.foot.size
  const z = ankle[2] + f.foot.forward
  const x = ankle[0]
  if (look.shoes.style === 'boots') {
    const heel = h * 0.7
    return (
      <>
        {/* The foot, lifted at the back onto its heel; the heel; the shaft round the ankle. */}
        <Rounded size={[w, h * 0.8, l * 0.92]} round={0.55} at={[x, heel * 0.45 + h * 0.4, z]} rot={[0.22, 0, 0]} color={c.shoes} />
        <Block size={[w * 0.62, heel, l * 0.2]} bevel={heel * 0.15} at={[x, heel / 2, z - l * 0.34]} color={c.shoes} />
        <Tube at={[x, h * 0.5, ankle[2]]} bottom={f.legs[0].bottom * 1.25} top={f.legs[0].bottom * 1.3} height={f.height * 0.12} color={c.shoes} />
      </>
    )
  }
  const flat = look.shoes.style === 'shoes' ? 0.75 : 1
  return <Rounded size={[w, h * flat, l]} round={0.6} at={[x, (h * flat) / 2, z]} color={c.shoes} />
}

/** The legs: trousers to the ankle; shorts to above the knee with bare legs below; under a skirt, bare legs. Their feet, and the hips that join them to the body. */
function Legs({ f, look, c }: { f: Figure; look: Look; c: Colours }) {
  const style = look.bottom.style
  return (
    <>
      {f.legs.map((leg, i) => {
        const hem = lerp(leg.to, leg.from, (f.knee + f.height * 0.06 - leg.to[1]) / (leg.from[1] - leg.to[1]))
        return (
          <group key={i}>
            {style === 'trousers' ? (
              <Taper {...leg} color={c.bottom} />
            ) : (
              <>
                <Taper {...leg} top={leg.top * 0.9} bottom={leg.bottom * 0.95} color={c.skin} />
                {style === 'shorts' && <Taper from={leg.from} to={hem} top={leg.top * 1.08} bottom={leg.top * 0.92} color={c.bottom} />}
              </>
            )}
            <Foot ankle={leg.to} f={f} look={look} c={c} />
          </group>
        )
      })}
      {style !== 'skirt' && <Soft part={f.hips} color={c.bottom} outline={false} />}
      {style === 'skirt' && <Bell from={f.knee * 0.5} to={f.hips.at[1] + f.hips.size[1] / 2} bottom={f.hips.size[0] * 0.75} top={f.hips.size[0] * 0.55} color={c.bottom} />}
    </>
  )
}

/** A bell of cloth from `from` up to `to`: a skirt. */
function Bell({ from, to, bottom, top, color }: { from: number; to: number; bottom: number; top: number; color: string }) {
  const h = to - from
  const profile: Point2[] = [[0, 0], [bottom, 0], [bottom, h * 0.04], [top * 1.04, h * 0.7], [top, h], [0, h]]
  return <Turned profile={profile} at={[0, from, 0]} sides={9} color={color} />
}

/* ───────────── the body ───────────── */

/** Where the small white bows of a patterned shirt sit on the chest's front, as shares of its half-width and half-height. */
const BOWS: Array<[number, number]> = [
  [-0.28, 0.32],
  [0.24, 0.4],
  [-0.02, -0.38],
]

/** A mark on a body part's front at (`x`, `y`) shares of its half-size, its middle standing `proud` out of it (less than zero: sunk). */
const onPart = (part: Part, x: number, y: number, proud = 0.0006) => {
  const { at, rot } = onRounded(part.size, TORSO_ROUND, (x * part.size[0]) / 2, (y * part.size[1]) / 2, -proud)
  return { at: plus(at, part.at), rot }
}

/**
 * The body from the hips to the shoulders, dressed by its top: a chest with
 * its shoulders, a waist, and the top's hem worn loose over the belt line; a
 * shirt's open collar and pattern, a hoodie's hood and pocket, a jumper's
 * or a tee's neckband, a cardigan open over what is under it; and a belt and
 * its buckle under the hem.
 */
function Body({ f, look, c }: { f: Figure; look: Look; c: Colours }) {
  const { chest, waist } = f
  const style = look.top.style
  const open = style === 'cardigan'
  const hem: Part = { at: [0, f.belt + f.height * 0.03, 0], size: [waist.size[0] * 1.06, f.height * 0.045, waist.size[2] * 1.06] }
  const neckTop = chest.at[1] + chest.size[1] / 2
  return (
    <>
      <Soft part={chest} color={c.top} />
      <Soft part={waist} color={c.top} outline={false} />
      <Soft part={hem} color={c.top} outline={false} />
      {/* What shows under an open cardigan, down its front. */}
      {open && <Rounded size={[chest.size[0] * 0.24, chest.size[1] * 0.9, f.height * 0.02]} round={0.5} {...onPart(chest, 0, 0, -f.height * 0.007)} color={c.under} outline={false} />}
      {open && <Rounded size={[waist.size[0] * 0.26, waist.size[1] * 0.9, f.height * 0.02]} round={0.5} {...onPart(waist, 0, 0, -f.height * 0.007)} color={c.under} />}
      {/* A shirt's open collar: a V of skin under the chin, and its two points. */}
      {style === 'shirt' && (
        <>
          <Extruded shape={[[-chest.size[0] * 0.13, 0], [chest.size[0] * 0.13, 0], [0, -chest.size[1] * 0.42]]} depth={0.0015} {...onPart(chest, 0, 0.92, 0.0004)} color={c.skin} outline={false} bevel={0.0004} />
          {[-1, 1].map((s) => (
            <Extruded key={s} shape={[[0, 0], [s * chest.size[0] * 0.16, 0.002], [s * chest.size[0] * 0.06, -chest.size[1] * 0.28]]} depth={0.002} {...onPart(chest, s * 0.08, 0.9, 0.0012)} color={c.top} bevel={0.0005} />
          ))}
        </>
      )}
      {look.top.pattern?.kind === 'bows' &&
        BOWS.map(([x, y]) => <Extruded key={`${x}${y}`} shape={bowOutline(chest.size[0] * 0.15, chest.size[0] * 0.09)} depth={0.0012} {...onPart(chest, x, y)} color={c.pattern} outline={false} bevel={0.0003} />)}
      {style === 'hoodie' && (
        <>
          {/* The hood, down, lying round the back of the neck; the pocket across the front; the strings. */}
          <Ring radius={chest.size[0] * 0.26} thickness={f.height * 0.045} sides={6} around={14} at={[0, neckTop - f.height * 0.008, -chest.size[2] * 0.2]} rot={[-0.35, 0, 0]} color={c.top} />
          <Rounded size={[waist.size[0] * 0.8, waist.size[1] * 0.7, f.height * 0.025]} round={0.5} {...onPart(waist, 0, -0.1, -f.height * 0.009)} color={c.top} />
          {[-1, 1].map((s) => (
            <Rod key={s} from={onPart(chest, s * 0.15, 0.85, 0.0012).at} to={onPart(chest, s * 0.17, 0.2, 0.0012).at} radius={f.height * 0.004} sides={5} color={c.under} outline={false} />
          ))}
        </>
      )}
      {(style === 'jumper' || style === 'tee') && (
        <Ring radius={f.neck.radius * 1.15} thickness={f.height * 0.018} sides={6} around={14} at={[0, neckTop - f.height * 0.008, 0]} color={c.top} />
      )}
      {look.belt && (
        <>
          <Rounded size={[f.hips.size[0] * 1.03, f.height * 0.03, f.hips.size[2] * 1.06]} round={TORSO_ROUND} at={[0, f.belt, 0]} color={c.belt} outline={false} />
          <Block size={[f.height * 0.04, f.height * 0.026, f.height * 0.01]} bevel={f.height * 0.003} at={[0, f.belt, (f.hips.size[2] * 1.06) / 2 - f.height * 0.002]} color={c.buckle} />
        </>
      )}
    </>
  )
}

/* ───────────── the arms ───────────── */

/**
 * One arm, from the shoulder to the hand, tapering, in its pose: hanging
 * down, raised and waving (its forearm rocking from the elbow in a `Sway`),
 * or with its hand in a pocket. Its sleeve runs to the wrist, is pushed up to
 * the elbow with a rolled cuff, or stops above the elbow.
 */
function Arm({ f, look, c, side, pose }: { f: Figure; look: Look; c: Colours; side: -1 | 1; pose: 'down' | 'wave' | 'pocket' }) {
  const { shoulder, elbow, hand } = armPose(f, side, pose)
  const a = f.arm
  const sleeves = look.top.sleeves ?? 'long'
  const mid = lerp(shoulder, elbow, 0.55)
  const bare = sleeves !== 'long'
  const forearm = (from: Vec3, to: Vec3) => (
    <>
      <Taper from={from} to={to} top={a.elbow} bottom={a.wrist} color={bare ? c.skin : c.top} />
      {/* A rolled cuff just under the elbow. */}
      {sleeves === 'rolled' && <Taper from={from} to={lerp(from, to, 0.28)} top={a.elbow * 1.3} bottom={a.elbow * 1.22} color={c.top} outline={false} />}
      {pose !== 'pocket' && <Blob radius={a.hand} squash={[0.8, 1.15, 0.8]} at={lerp(from, to, 1.1)} color={c.skin} />}
    </>
  )
  return (
    <>
      {/* The shoulder, rounding the top of the chest into the arm. */}
      <Blob radius={a.shoulder * 1.15} squash={[1, 0.9, 1]} at={plus(shoulder, [0, f.height * 0.012, 0])} color={c.top} outline={false} />
      {sleeves === 'short' ? (
        <>
          <Taper from={shoulder} to={mid} top={a.shoulder * 1.15} bottom={a.shoulder * 1.05} color={c.top} />
          <Taper from={mid} to={elbow} top={a.shoulder * 0.85} bottom={a.elbow} color={c.skin} />
        </>
      ) : (
        <Taper from={shoulder} to={elbow} top={a.shoulder} bottom={a.elbow} color={c.top} />
      )}
      <Blob radius={a.elbow} at={elbow} color={bare ? c.skin : c.top} outline={false} />
      {pose === 'wave' ? (
        <Sway at={elbow} axis="z" amount={0.35} speed={3}>
          {forearm([0, 0, 0], [hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]])}
        </Sway>
      ) : (
        forearm(elbow, hand)
      )}
    </>
  )
}

/* ───────────── the head ───────────── */

/** A point on the face's front, `x` across and `y` up from the head's middle, in the head's frame. */
function onFace(f: Figure, x: number, y: number, sink = 0) {
  const { at, rot } = onRounded(f.face.size, FACE_ROUND, x - f.face.at[0], y - f.face.at[1], sink)
  return { at: plus(at, f.face.at), rot }
}

/** A placement turned so that a `Ring` (which lies flat round the upright) faces out along it, as a hoop on a face does. */
function turnedUp({ at, rot }: { at: Vec3; rot: Vec3 }) {
  return { at, rot: [rot[0] + Math.PI / 2, rot[1], rot[2]] as Vec3 }
}

/** The face: eyes (a coloured iris and a pupil, or dark eyes), brows, a nose, a small smile; a beard; a nose ring; glasses. In the head's own frame. */
function Face({ f, look, c }: { f: Figure; look: Look; c: Colours }) {
  const [, hh] = f.head.size
  const { x: ex, y: ey, size: es } = f.eyes
  // A beard covers the jaw: the mouth sits on its front.
  const beard = look.beard ? { size: [f.face.size[0] * 1.02, hh * 0.42, f.face.size[2] * 0.9] as Vec3, at: [0, -hh * 0.33, f.face.at[2] + f.face.size[2] * 0.12] as Vec3 } : null
  const mouth = beard ? { at: plus(onRounded(beard.size, 0.8, 0, hh * 0.1, -0.0005).at, beard.at), rot: [0, 0, 0] as Vec3 } : onFace(f, 0, f.mouth.y, -0.0003)
  const browY = ey + f.brows
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s}>
          {c.iris ? (
            <>
              <Blob radius={es} squash={[0.95, 1.1, 0.4]} {...onFace(f, s * ex, ey, es * 0.15)} color={c.iris} outline={false} />
              <Blob radius={es * 0.52} squash={[1, 1.1, 0.5]} {...onFace(f, s * ex, ey, -es * 0.2)} color={c.eye} outline={false} />
            </>
          ) : (
            <Blob radius={es * 0.85} squash={[0.85, 1.15, 0.45]} {...onFace(f, s * ex, ey, es * 0.1)} color={c.eye} outline={false} />
          )}
          {/* A brow, in the hair's colour, lifting a little toward the outside. */}
          <Block size={[es * 3.4, es * 0.8, es * 0.6]} bevel={es * 0.25} {...withTurn(onFace(f, s * ex, browY, -es * 0.1), s * 0.05)} color={c.hair} outline={false} />
        </group>
      ))}
      <Blob radius={hh * 0.05} squash={[0.8, 1, 0.8]} {...onFace(f, 0, -hh * 0.08, hh * 0.02)} color={c.skin} outline={false} />
      {beard && <Rounded size={beard.size} round={0.8} at={beard.at} color={c.beard} />}
      <Extruded shape={smileOutline(f.mouth.width, f.mouth.width * 0.2)} depth={0.0012} {...mouth} color={c.mouth} outline={false} bevel={0.0003} />
      {/* A small ring in her left nostril (the viewer's right). */}
      {look.noseRing && <Ring radius={hh * 0.026} thickness={hh * 0.011} sides={6} around={10} {...turnedUp(onFace(f, hh * 0.04, -hh * 0.105, -hh * 0.012))} color={c.ring} outline={false} />}
      {look.accessory === 'glasses' && <Glasses f={f} c={c} shape="rect" />}
      {look.accessory === 'round-glasses' && <Glasses f={f} c={c} shape="round" />}
    </>
  )
}

/** A placement turned a little more about its own forward axis. */
function withTurn({ at, rot }: { at: Vec3; rot: Vec3 }, z: number) {
  return { at, rot: [rot[0], rot[1], rot[2] + z] as Vec3 }
}

/**
 * Glasses: two lenses' frames each about a third of the face's width, on the
 * upper half of the face, rectangular with their top outer corners lifted (a
 * little cat-eye) or round; a bridge, and the arms back to the ears.
 */
function Glasses({ f, c, shape }: { f: Figure; c: Colours; shape: 'rect' | 'round' }) {
  const hh = f.head.size[1]
  const { x: lx, y: ey } = f.eyes
  const front = onFace(f, lx, ey).at[2] + hh * 0.03
  const bar = hh * 0.052
  const lens = shape === 'rect' ? { w: f.face.size[0] / 3, h: hh * 0.15 } : { w: hh * 0.2, h: hh * 0.2 }
  const outer = lx + lens.w / 2
  const depth = bar * 0.9
  // A slight bevel only: a frame this thin would otherwise be all edge, and the edge light would grey it.
  const frame = (size: Vec3, at: Vec3, turn = 0) => <Block size={size} bevel={bar * 0.08} at={at} rot={[0, 0, turn]} color={c.accessory} outline={false} />
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s}>
          {shape === 'rect' ? (
            <>
              {/* The top rising toward the outside, the outer side the taller: a little cat-eye. */}
              {frame([lens.w + bar * 0.6, bar * 1.25, depth], [s * (lx + bar * 0.3), ey + lens.h / 2 + bar * 0.35, front], s * 0.07)}
              {frame([lens.w * 0.92, bar, depth], [s * lx, ey - lens.h / 2, front])}
              {frame([bar, lens.h + bar, depth], [s * (lx - lens.w / 2), ey, front])}
              {frame([bar, lens.h + bar * 2.4, depth], [s * outer, ey + bar * 0.6, front])}
            </>
          ) : (
            <Ring radius={lens.w / 2} thickness={bar * 0.8} sides={6} around={16} at={[s * lx, ey, front]} rot={[Math.PI / 2, 0, 0]} color={c.accessory} outline={false} />
          )}
          {/* The arm, from the lens's outer edge back toward the ear, into the hair. */}
          <Block size={[bar * 0.8, bar * 0.8, hh * 0.16]} bevel={bar * 0.08} at={[s * outer, ey + lens.h * 0.3, front - hh * 0.08]} rot={[0, s * 0.35, 0]} color={c.accessory} outline={false} />
        </group>
      ))}
      {frame([lx * 2 - lens.w, bar, depth], [0, ey + lens.h * 0.15, front])}
    </>
  )
}

/**
 * Long, thick, wavy hair, parted a little to her left: a full crown, and from
 * under it locks falling in loose waves past the shoulders to the elbows, one
 * down each side of the face from the parting and the rest round the sides
 * and the back (`longWaves` says where each runs). Brown, with the blonde as
 * whole locks: the one down the right of her face (the viewer's left) and a
 * slim one through the lengths on her left.
 */
function LongWaves({ f, c }: { f: Figure; c: Colours }) {
  const [hw, hh, hd] = f.head.size
  return (
    <>
      <Rounded size={[hw * CROWN.size[0], hh * CROWN.size[1], hd * CROWN.size[2]]} round={CROWN.round} at={[0, hh * CROWN.up, -hd * CROWN.back]} color={c.hair} />
      {longWaves(f).map((lock, i) => (
        <Swept key={i} path={lock.path} widths={lock.widths} facing={lock.facing} sides={LOCK_SIDES} steps={(lock.path.length - 1) * 2} color={lock.streak ? c.streaks : c.hair} outline={lock.outline} />
      ))}
    </>
  )
}

/**
 * Long, straight hair parted in the middle: a crown over the brow, a fall
 * down the back to below the shoulders, and a curtain each side of the face
 * to the shoulders. In the head's frame.
 */
function LongStraight({ f, c }: { f: Figure; c: Colours }) {
  const [hw, hh, hd] = f.head.size
  const top = hh * 0.22
  // The back to below the shoulder blades; the sides to the shoulders.
  const back = f.shoulder.y - f.arm.upper * 0.55 - f.head.at[1]
  const side = f.shoulder.y - f.head.at[1] + hh * 0.02
  return (
    <>
      <Rounded size={[hw * 1.16, hh * 1.02, hd * 1.04]} round={HEAD_ROUND} at={[0, hh * 0.08, -hd * 0.12]} color={c.hair} />
      <Rounded size={[hw * 1.08, top - back, hd * 0.34]} round={0.85} at={[0, (top + back) / 2, -hd * 0.34]} color={c.hair} />
      {[-1, 1].map((s) => (
        <Rounded key={s} size={[hw * 0.26, hh * 0.1 - side, hd * 0.42]} round={0.85} at={[s * hw * 0.52, (hh * 0.1 + side) / 2, -hd * 0.04]} color={c.hair} />
      ))}
    </>
  )
}

/** The hair, in the head's frame, by its style. Ears where the hair leaves them showing. */
function Hair({ f, look, c }: { f: Figure; look: Look; c: Colours }) {
  const [hw, hh, hd] = f.head.size
  const style = look.hair.style
  const helmet = (size: Vec3, at: Vec3, round = HEAD_ROUND) => <Rounded size={size} round={round} at={at} color={c.hair} />
  const ears = style === 'curls' || style === 'bun' || style === 'crop' || style === 'ponytail'
  return (
    <>
      {ears && [-1, 1].map((s) => <Blob key={s} radius={hh * 0.12} squash={[0.45, 1, 0.75]} at={[s * hw * 0.5, -hh * 0.06, -hd * 0.05]} color={c.skin} outline={false} />)}
      {style === 'long-wavy' && <LongWaves f={f} c={c} />}
      {style === 'long' && <LongStraight f={f} c={c} />}
      {style === 'curls' && <Tufted radius={hw * 0.6} squash={[1, 0.8, 1.02]} tufts={22} depth={0.28} at={[0, hh * 0.22, -hd * 0.2]} color={c.hair} />}
      {style === 'bob' && (
        <>
          {helmet([hw * 1.18, hh * 1.0, hd * 1.02], [0, hh * 0.05, -hd * 0.14])}
          <Rounded size={[hw * 0.92, hh * 0.2, hd * 0.3]} round={0.8} at={[hw * 0.05, hh * 0.36, hd * 0.3]} rot={[0.15, 0, -0.12]} color={c.hair} />
        </>
      )}
      {/* Drawn back from the face: a bun on the crown, or a ponytail falling from the back of the head. */}
      {(style === 'bun' || style === 'ponytail') && helmet([hw * 1.08, hh * 0.8, hd * 0.98], [0, hh * 0.16, -hd * 0.12])}
      {style === 'bun' && <Blob radius={hh * 0.21} at={[0, hh * 0.62, -hd * 0.14]} color={c.hair} />}
      {style === 'ponytail' && (
        <>
          {/* Tied high at the back and swinging out to one side, so it shows from the front too. */}
          <Blob radius={hh * 0.13} at={[hw * 0.12, hh * 0.32, -hd * 0.56]} color={c.hair} outline={false} />
          <Rounded size={[hw * 0.36, hh * 0.85, hd * 0.3]} round={0.85} at={[hw * 0.42, -hh * 0.06, -hd * 0.62]} rot={[-0.3, 0, 0.5]} color={c.hair} />
        </>
      )}
      {/* Short all over, a little fuller at the front. */}
      {style === 'crop' && (
        <>
          {helmet([hw * 1.06, hh * 0.76, hd * 1.0], [0, hh * 0.18, -hd * 0.06])}
          <Rounded size={[hw * 0.84, hh * 0.18, hd * 0.32]} round={0.85} at={[0, hh * 0.44, hd * 0.26]} rot={[0.3, 0, 0]} color={c.hair} outline={false} />
        </>
      )}
    </>
  )
}

/** What the figure wears besides, on its body: a backpack, its straps over the shoulders. */
function Extras({ f, look, c }: { f: Figure; look: Look; c: Colours }) {
  const { chest } = f
  if (look.accessory !== 'backpack') return null
  return (
    <>
      <Rounded size={[chest.size[0] * 0.78, chest.size[1] * 1.3, f.height * 0.085]} round={0.55} at={[0, chest.at[1] - chest.size[1] * 0.2, -(chest.size[2] / 2 + f.height * 0.035)]} color={c.accessory} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[f.height * 0.022, chest.size[1] * 0.8, f.height * 0.01]} bevel={f.height * 0.004} {...onPart(chest, s * 0.5, 0.15, -f.height * 0.002)} color={c.accessory} />
      ))}
    </>
  )
}

/**
 * A person, from their look: standing on their feet facing +Z, as tall as
 * `characterHeight` says. `waving` raises their right arm (at -x) and rocks
 * its forearm from the elbow; a look with a hand in a pocket keeps its left
 * hand there. Named `character` so a test can find it.
 */
export function Character({ look, waving = false }: { look: Look; waving?: boolean }) {
  const f = figureOf(look)
  const c = coloursOf(look)
  const left = look.pose === 'hand-in-pocket' ? 'pocket' : 'down'
  return (
    <group name="character">
      <Legs f={f} look={look} c={c} />
      <Body f={f} look={look} c={c} />
      <Arm f={f} look={look} c={c} side={-1} pose={waving ? 'wave' : 'down'} />
      <Arm f={f} look={look} c={c} side={1} pose={left} />
      <Extras f={f} look={look} c={c} />
      <Rod from={[0, f.neck.from, 0]} to={[0, f.neck.to, 0]} radius={f.neck.radius} sides={LIMB_SIDES} color={c.skin} outline={false} />
      {/* The head tipped back a touch, the face turned up to the light: relaxed, and lit from brow to chin. */}
      <group position={f.head.at} rotation={[-HEAD_TILT, 0, 0]}>
        <Rounded size={f.head.size} round={HEAD_ROUND} color={c.skin} />
        <Rounded size={f.face.size} round={FACE_ROUND} at={f.face.at} color={c.skin} outline={false} />
        <Face f={f} look={look} c={c} />
        <Hair f={f} look={look} c={c} />
      </group>
    </group>
  )
}
