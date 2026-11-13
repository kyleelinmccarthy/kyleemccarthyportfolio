'use client'

import { landmark } from '@/content/sky'
import {
  Blob,
  Block,
  Extruded,
  Lit,
  Ring,
  Rounded,
  Sway,
  Tube,
  Turned,
  blend,
  bowOutline,
  heightWithin,
  pointing,
  smileOutline,
  stackUp,
  type Point2,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/** The sand court: its size, the sand's depth, and the low kerb round it. */
const COURT = { width: 1.86, depth: 1.36, sand: 0.05, kerb: 0.06, kerbRise: 0.035 }
/** The finish line across the court, in front of the Doll, and the striped posts at its ends. */
const LINE = { z: -0.04, width: 0.028, post: 0.024, postHeight: 0.42, bands: 3, sides: 10 }
/** Where the Doll stands, and the bare tree behind her (its top is the place's height). */
const DOLL_AT: Vec3 = [0, 0, -0.34]
const TREE_AT: Vec3 = [0.66, 0, -0.52]
/** The gift boxes: a larger one on the sand with a smaller one stacked on it, well left of the tree so each reads on its own. */
const GIFT = { at: [0.3, 0, 0.3] as Vec3, size: 0.2, top: 0.13 }
/** The players, in front of the line. */
const DONUT_AT: Vec3 = [-0.44, 0, 0.3]
const EGG_AT: Vec3 = [-0.06, 0, 0.42]

/*
 * One colour per material, and each is a draw call once batched (R40), so the
 * darks are shared: the hair's plum-brown also paints the smile and the egg's
 * flippers, the shoes' maroon the donut's nostrils, the cheeks' pink its snout.
 */
type Colours = Record<'sand' | 'kerb' | 'line' | 'white' | 'skin' | 'hair' | 'dress' | 'blue' | 'shoe' | 'blush' | 'eye' | 'bark' | 'box' | 'lid' | 'ribbon' | 'dough' | 'frosting', string>

/** How round the Doll's bob is (a `Rounded`'s `round`): a soft dome over straight sides. */
const HAIR_ROUND = 0.62

/**
 * A head band over the crown of a rounded shape `a` wide and `b` tall either
 * side of its middle (rounded by `round`, as `Rounded` is): an arch following
 * its upper half, `out` proud of it and reaching `into` it, ending at its sides.
 */
function band(a: number, b: number, round: number, out: number, into: number): Point2[] {
  const steps = 16
  const arc = (ra: number, rb: number) =>
    Array.from({ length: steps + 1 }, (_, k) => {
      const t = (k / steps) * Math.PI
      const c = Math.cos(t)
      return [ra * Math.sign(c) * Math.abs(c) ** round, rb * Math.sin(t) ** round] as Point2
    })
  return [...arc(a + out, b + out), ...arc(a - into, b - into).reverse()]
}

/** A tube laid from one point to another (`pointing`), tapering from `bottom` to `top`; `sides` for a slender one seen small. */
function Limb({ from, to, bottom, top, color, sides, outline = true }: { from: Vec3; to: Vec3; bottom: number; top: number; color: string; sides?: number; outline?: boolean }) {
  const { at, rot, length } = pointing(from, to)
  return <Tube at={at} rot={rot} height={length} bottom={bottom} top={top} sides={sides} bevel={Math.min(top, bottom) * 0.6} color={color} outline={outline} />
}

/**
 * The Doll, who runs red light, green light: a big rounded head under a
 * dark bob with straight bangs and a blue band and bow, red eyes lit at every
 * hour, pink cheeks and a small smile; a pink A-line dress with a blue sailor
 * collar and bow, puffed sleeves, white arms and legs, dark shoes. Her head
 * turns slowly from side to side about her neck. Built on her feet, facing +Z.
 */
/**
 * The Doll's build, bottom up: her legs (to where the dress's hem tucks over
 * them), her dress from hem to shoulders, and her head, its chin sunk a little
 * into her collar. The bob's helmet, the face set into its front and the
 * bangs and locks cut straight across it, all in the head's own frame.
 */
const DOLL = {
  legs: 0.13,
  dress: 0.35,
  chin: 0.025,
  /** The hair's helmet [width, height, depth], round its middle; its front is the plane the face is set into. */
  hair: [0.54, 0.47, 0.4] as Vec3,
  /** The face, as far forward of the helmet's front as it stands, and its size. */
  face: { size: [0.42, 0.31, 0.3] as Vec3, proud: 0.02 },
  /** The bangs and locks: how far in front of the face, their depth back into the helmet, where the bangs run and how wide the face's window is. */
  fringe: { proud: 0.012, depth: 0.09, bottom: 0.025, top: 0.13, window: 0.165 },
}

/**
 * The Doll, who runs red light, green light: a big rounded head under a
 * dark bob with straight bangs and a blue band and bow, red eyes lit at every
 * hour, pink cheeks and a small smile; a pink A-line dress with a blue sailor
 * collar and bow, puffed sleeves, white arms and legs, dark shoes. Her head
 * turns slowly from side to side about her neck. Built bottom up on her feet
 * (`stackUp`), facing +Z: a taller dress carries her arms and head up with it.
 */
function Doll({ at, colour }: { at: Vec3; colour: Colours }) {
  const [, hem, shoulder] = stackUp(0, [DOLL.legs, DOLL.dress])
  const d = DOLL.dress
  const collar = shoulder - 0.055
  const sleeve = shoulder - 0.065
  return (
    <group position={at}>
      {/* Legs and shoes. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* From the shoe up under the hem. */}
          <Tube at={[s * 0.07, 0.03, 0]} bottom={0.04} top={0.042} height={hem} sides={10} color={colour.white} bevel={0.012} />
          <Rounded size={[0.1, 0.055, 0.15]} round={0.5} at={[s * 0.07, 0.027, 0.018]} color={colour.shoe} />
        </group>
      ))}
      {/* The dress: an A-line bell from the hem to the shoulders. */}
      <Turned
        profile={[[0, 0], [0.2, 0], [0.2, 0.02], [0.15, d * 0.54], [0.11, d * 0.89], [0.07, d], [0, d]]}
        at={[0, hem, 0]}
        sides={16}
        color={colour.dress}
      />
      {/* The sailor collar over the shoulders, and its bow at the front. */}
      <Turned profile={[[0, 0], [0.145, 0], [0.145, 0.015], [0.09, 0.06], [0, 0.065]]} at={[0, collar, 0]} sides={16} color={colour.blue} />
      <Extruded shape={bowOutline(0.13, 0.065)} depth={0.025} at={[0, collar, 0.13]} rot={[-0.25, 0, 0]} color={colour.blue} bevel={0.006} />
      <Blob radius={0.018} at={[0, collar, 0.142]} color={colour.blue} />
      {/* Puffed sleeves, and white arms hanging a little out from her sides, with mitten hands. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Blob radius={0.062} squash={[0.9, 0.85, 0.95]} at={[s * 0.135, sleeve, 0]} color={colour.dress} />
          <Limb from={[s * 0.16, sleeve - 0.015, 0]} to={[s * 0.205, sleeve - 0.165, 0.02]} bottom={0.034} top={0.032} sides={10} color={colour.white} />
          <Blob radius={0.04} squash={[0.85, 1.05, 0.9]} at={[s * 0.21, sleeve - 0.18, 0.022]} color={colour.white} />
        </group>
      ))}
      {/* The head turns slowly about her neck: watching for anyone who moves. */}
      <Sway at={[0, shoulder, 0]} axis="y" amount={0.5} speed={0.3}>
        <Head colour={colour} />
      </Sway>
    </group>
  )
}

/**
 * The front of a bob, seen face on: straight bangs across the brow and a lock
 * down each side to the jaw, an inverted U round the face's window. `half` is
 * half its width, `jaw` and `top` its foot and the bangs' top edge, `bottom`
 * the bangs' lower edge, `window` half the face's width. Its outer top corners
 * are rounded, as the helmet behind it is.
 */
function fringe(half: number, jaw: number, bottom: number, top: number, window: number): Point2[] {
  const r = Math.min(0.1, (top - jaw) / 3)
  const corner = (cx: number, cy: number, from: number) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = from + (k / 4) * (Math.PI / 2)
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Point2
    })
  return [
    [half, jaw],
    ...corner(half - r, top - r, 0),
    ...corner(-half + r, top - r, Math.PI / 2),
    [-half, jaw],
    [-window, jaw],
    [-window, bottom],
    [window, bottom],
    [window, jaw],
  ]
}

/**
 * The Doll's head, built round the top of her neck: a helmet of hair round the
 * back, top and sides, her face set into its front, straight bangs and side
 * locks cut across it in one piece, the band over her crown and its bow, red
 * eyes with a glint, pink cheeks and a small smile.
 */
function Head({ colour }: { colour: Colours }) {
  const { hair, face, fringe: f } = DOLL
  // The head's middle, above the neck: the helmet's foot (her jaw) sits on the collar.
  const y = hair[1] / 2 - DOLL.chin
  const hairZ = -0.03
  const front = hairZ + hair[2] / 2
  const faceFront = front + face.proud
  const faceY = y - hair[1] / 2 + face.size[1] / 2
  const fringeFront = faceFront + f.proud
  const eyeY = y - 0.035
  const jaw = y - hair[1] / 2
  return (
    <group>
      <Rounded size={hair} round={HAIR_ROUND} at={[0, y, hairZ]} color={colour.hair} />
      <Rounded size={face.size} round={0.38} at={[0, faceY, faceFront - face.size[2] / 2]} color={colour.skin} />
      <Extruded
        shape={fringe(hair[0] / 2, jaw, y + f.bottom, y + f.top, f.window)}
        depth={f.depth}
        at={[0, 0, fringeFront - f.depth / 2]}
        color={colour.hair}
        bevel={0.01}
      />
      {/* The band over her crown, and its bow at one side. */}
      <Extruded shape={band(hair[0] / 2, hair[1] / 2, HAIR_ROUND, 0.014, 0.03)} depth={0.06} at={[0, y, hairZ + 0.01]} color={colour.blue} bevel={0.006} />
      <Extruded shape={bowOutline(0.16, 0.08)} depth={0.03} at={[0.15, y + hair[1] / 2 + 0.03, hairZ + 0.06]} rot={[-0.35, 0.3, 0.35]} color={colour.blue} bevel={0.007} />
      {/* Red eyes, lit at every hour, each with a glint; pink cheeks; a small smile. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Lit size={[0.07, 0.08, 0.03]} at={[s * 0.1, eyeY, faceFront]} color={colour.eye} always outline={false} />
          <Block size={[0.02, 0.02, 0.012]} at={[s * 0.1 - 0.012, eyeY + 0.016, faceFront + 0.016]} color={colour.white} bevel={0.004} outline={false} />
          <Blob radius={0.038} squash={[1, 0.5, 0.25]} at={[s * 0.14, eyeY - 0.06, faceFront - 0.002]} color={colour.blush} outline={false} />
        </group>
      ))}
      <Extruded shape={smileOutline(0.1, 0.013)} depth={0.012} at={[0, eyeY - 0.09, faceFront + 0.002]} color={colour.hair} bevel={0.003} outline={false} />
    </group>
  )
}

/** How tall a gift box of `size` stands to the top of its lid. */
const giftTop = (size: number) => size * 0.82 + size * 0.2 - 0.004

/**
 * A gift box with its lid, a ribbon both ways round it and (unless another
 * box stands on it) a bow on top: where the eliminated go. Built on its foot.
 */
function Gift({ at, turn, size, bowed = true, colour }: { at: Vec3; turn: number; size: number; bowed?: boolean; colour: Colours }) {
  const body = size * 0.82
  const lid = size * 0.2
  const band = size * 0.17
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Block size={[size, body, size]} at={[0, body / 2, 0]} color={colour.box} bevel={0.008} />
      <Block size={[size + 0.016, lid, size + 0.016]} at={[0, body + lid / 2 - 0.004, 0]} color={colour.lid} bevel={0.008} />
      {/* The ribbon: a band down each face, standing a hair proud of the box and the lid. */}
      <Block size={[band, body + lid, size + 0.026]} at={[0, (body + lid) / 2 - 0.002, 0]} color={colour.ribbon} bevel={0.004} />
      <Block size={[size + 0.026, body + lid, band]} at={[0, (body + lid) / 2 - 0.002, 0]} color={colour.ribbon} bevel={0.004} />
      {/* The bow: two loops and a knot. */}
      {bowed && (
        <>
          {[-1, 1].map((s) => (
            <Ring key={s} radius={size * 0.15} thickness={size * 0.09} sides={6} around={14} at={[s * size * 0.14, body + lid + size * 0.08, 0]} rot={[Math.PI / 2, s * 0.5, 0.35 * s]} color={colour.ribbon} />
          ))}
          <Blob radius={size * 0.07} at={[0, body + lid + size * 0.04, 0]} color={colour.ribbon} />
        </>
      )}
    </group>
  )
}

/** How far the donut's frosting sits up and forward of its dough ring. */
const FROSTING = { up: 0.04, forward: 0.012 }
/** The donut's snout: its size, how far above the ring's lowest middle it sits, and how far forward. */
const SNOUT = { radius: 0.032, up: 0.006, z: 0.05 }

/**
 * The pink-frosted donut on little legs: a fat ring standing on edge, its
 * dough showing under thick pink frosting that drips at the sides, sprinkles,
 * and a snout of two pink rings below the hole. Built on its feet, facing +Z.
 */
function Donut({ at, turn, colour }: { at: Vec3; turn: number; colour: Colours }) {
  const ring = { radius: 0.095, thickness: 0.11 }
  const legs = 0.05
  const cy = legs + ring.radius + ring.thickness / 2 - 0.01
  const sprinkles: Array<[number, number, number, string]> = [
    [-0.08, 0.07, 0.6, colour.lid],
    [-0.03, 0.12, -0.4, colour.white],
    [0.04, 0.115, 1.1, colour.dough],
    [0.09, 0.06, -0.9, colour.white],
    [-0.11, 0.0, 0.3, colour.white],
    [0.11, -0.005, 1.4, colour.lid],
    [0.0, 0.142, 0.2, colour.lid],
    [-0.065, 0.11, 1.9, colour.dough],
    [0.07, 0.1, 0.5, colour.lid],
  ]
  return (
    <group position={at} rotation={[0, turn, 0]}>
      {[-1, 1].map((s) => (
        <Tube key={s} at={[s * 0.06, 0, 0.005]} bottom={0.022} top={0.02} height={legs + 0.02} sides={9} color={colour.dough} bevel={0.008} />
      ))}
      <Ring radius={ring.radius} thickness={ring.thickness} sides={8} around={20} at={[0, cy, 0]} rot={[Math.PI / 2, 0, 0]} color={colour.dough} />
      {/* The frosting: a ring set up and a little forward, so it caps the top and the front and the dough shows below the hole. */}
      <Ring radius={ring.radius} thickness={ring.thickness * 0.9} sides={8} around={20} at={[0, cy + FROSTING.up, FROSTING.forward]} rot={[Math.PI / 2, 0, 0]} color={colour.frosting} />
      {[
        [-0.13, -0.05, 0.018],
        [0.135, -0.06, 0.016],
      ].map(([x, y, r]) => (
        <Blob key={x} radius={r} squash={[0.8, 1.8, 0.8]} at={[x, cy + y, 0.04]} color={colour.frosting} outline={false} />
      ))}
      {sprinkles.map(([x, y, r, c]) => {
        // On the frosting's front face, where it bulges toward the viewer.
        const d = Math.hypot(x, y - FROSTING.up) - ring.radius
        const z = FROSTING.forward + Math.sqrt(Math.max(0, (ring.thickness * 0.45) ** 2 - d * d)) - 0.004
        return <Block key={`${x}${y}`} size={[0.022, 0.007, 0.007]} at={[x, cy + y, z]} rot={[0, 0, r]} color={c} bevel={0.0025} outline={false} />
      })}
      {/* The snout: one pink oval on the lower front of the ring, below the hole, with two dark nostrils. */}
      <Blob radius={SNOUT.radius} squash={[1.45, 0.95, 0.42]} at={[0, cy - ring.radius + SNOUT.up, SNOUT.z]} color={colour.blush} />
      {[-1, 1].map((s) => (
        <Blob key={s} radius={0.011} squash={[0.8, 1.15, 0.5]} at={[s * 0.019, cy - ring.radius + SNOUT.up, SNOUT.z + SNOUT.radius * 0.42 - 0.002]} color={colour.shoe} outline={false} />
      ))}
    </group>
  )
}

/** The white egg, leaning a little, with dark flippers at its sides and two dark eyes looking off to its right. Built on its foot, facing +Z. */
function Egg({ at, turn, colour }: { at: Vec3; turn: number; colour: Colours }) {
  const shell: Point2[] = [[0, 0], [0.055, 0.008], [0.088, 0.05], [0.098, 0.115], [0.09, 0.18], [0.066, 0.25], [0.034, 0.29], [0, 0.3]]
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <group rotation={[0, 0, -0.12]}>
        <Turned profile={shell} sides={14} color={colour.white} />
        {[-1, 1].map((s) => (
          <Blob key={s} radius={0.056} squash={[0.3, 1, 0.6]} at={[s * 0.1, 0.1, -0.004]} rot={[0, 0, -s * 0.18]} color={colour.hair} />
        ))}
        {[0.5, 1.05].map((a) => (
          <Blob key={a} radius={0.014} squash={[0.8, 1.25, 0.5]} at={[0.087 * Math.sin(a), 0.2, 0.087 * Math.cos(a)]} rot={[0, a, 0]} color={colour.hair} outline={false} />
        ))}
      </group>
    </group>
  )
}

/**
 * The bare tree behind the Doll: a dark trunk forking into branches that
 * reach up to the place's height, each with a twig or two. `height` is the
 * top of its highest twig; the trunk and branches follow it.
 */
function Tree({ at, height, colour }: { at: Vec3; height: number; colour: Colours }) {
  const k = height / 1.9
  const fork: Vec3 = [0, 0.86 * k, 0]
  // Branches from the fork: where each ends, and its twigs (each from a share of the way along it to its own end).
  const branches: Array<{ to: Vec3; r: number; twigs: Array<[number, Vec3]> }> = [
    { to: [-0.32, 1.52 * k, 0.06], r: 0.034, twigs: [[0.55, [-0.42, 1.32 * k, -0.08]], [0.8, [-0.22, 1.66 * k, 0.12]]] },
    { to: [0.05, 1.9 * k - 0.012, -0.04], r: 0.032, twigs: [[0.6, [0.2, 1.72 * k, -0.02]]] },
    { to: [0.33, 1.48 * k, 0.04], r: 0.032, twigs: [[0.5, [0.44, 1.36 * k, 0.16]], [0.75, [0.3, 1.72 * k, 0.1]]] },
    { to: [0.08, 1.3 * k, 0.3], r: 0.026, twigs: [] },
  ]
  return (
    <group position={at}>
      <Limb from={[0, -0.01, 0]} to={fork} bottom={0.075} top={0.05} color={colour.bark} />
      {branches.map(({ to, r, twigs }) => {
        const along = (t: number): Vec3 => [fork[0] + (to[0] - fork[0]) * t, fork[1] + (to[1] - fork[1]) * t, fork[2] + (to[2] - fork[2]) * t]
        return (
          <group key={to.join()}>
            <Limb from={fork} to={to} bottom={0.046} top={r * 0.45} sides={9} color={colour.bark} />
            {twigs.map(([t, end]) => (
              <Limb key={end.join()} from={along(t)} to={end} bottom={r * 0.55} top={r * 0.25} sides={9} color={colour.bark} outline={false} />
            ))}
          </group>
        )
      })}
    </group>
  )
}

/**
 * Eliminated: a party game for 2 to 8 players, run by a sinister Game Master,
 * where the losers are boxed up with a little pink bow. Its landmark is the
 * red light, green light court from the capsule art: a sand court in a dark
 * kerb with a red finish line between striped posts; the Doll at its far end
 * by a bare tree, her red eyes lit and her head slowly turning; a gift box with
 * a pink bow; and two of the players, the pink-frosted donut on its little legs
 * and the white egg, caught mid-game.
 *
 * Three levels of detail. The main mass: the court, the Doll and the tree.
 * The secondary forms: the kerb, the finish line and its posts, the Doll's
 * hair, collar and dress, the gift box's lid and ribbon. The props: the
 * players, the bows, the eyes and smile, the sprinkles and the snout.
 *
 * The tree's top stands at the place's height, from 1.6 to 2.2
 * (`Playground.heights`); the court and the characters keep their size.
 */
export function Playground({ place, district }: ModelProps) {
  const colour: Colours = {
    sand: landmark.sand,
    kerb: blend(landmark.blue, landmark.indigo, 0.72),
    line: landmark.red,
    white: landmark.offWhite,
    skin: blend(landmark.offWhite, landmark.pink, 0.1),
    // A dark warm brown, almost plum.
    hair: blend(landmark.indigo, landmark.brick, 0.25),
    dress: landmark.pink,
    blue: landmark.blue,
    shoe: blend(landmark.brick, landmark.indigo, 0.55),
    blush: blend(landmark.pink, landmark.coral, 0.35),
    eye: landmark.red,
    bark: blend(landmark.wood, landmark.indigo, 0.58),
    box: blend(landmark.slate, landmark.indigo, 0.55),
    lid: blend(landmark.slate, landmark.indigo, 0.42),
    ribbon: district.color,
    dough: blend(landmark.orange, landmark.wood, 0.25),
    frosting: blend(landmark.pink, district.color, 0.35),
  }
  const height = heightWithin(place.height, Playground.heights)
  const { width, depth, sand, kerb, kerbRise } = COURT
  const top = sand
  const on = ([x, , z]: Vec3): Vec3 => [x, top, z]

  return (
    <group>
      {/* The court: sand in a low dark kerb. */}
      <Block size={[width, sand, depth]} at={[0, sand / 2, 0]} color={colour.sand} bevel={0.02} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block size={[width + 2 * kerb, sand + kerbRise, kerb]} at={[0, (sand + kerbRise) / 2, s * (depth / 2 + kerb / 2)]} color={colour.kerb} bevel={0.015} />
          <Block size={[kerb, sand + kerbRise, depth]} at={[s * (width / 2 + kerb / 2), (sand + kerbRise) / 2, 0]} color={colour.kerb} bevel={0.015} />
        </group>
      ))}

      {/* The finish line, and a striped post at each end of it. */}
      <Block size={[width - 0.14, 0.008, LINE.width]} at={[0, top + 0.002, LINE.z]} color={colour.line} bevel={0.003} outline={false} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (width / 2 - 0.05), top, LINE.z]}>
          <Tube bottom={LINE.post} top={LINE.post} height={LINE.postHeight} sides={LINE.sides} color={colour.white} bevel={0.01} />
          {Array.from({ length: LINE.bands }, (_, i) => (
            <Tube key={i} at={[0, 0.03 + (LINE.postHeight - 0.03) * ((2 * i + 1) / (2 * LINE.bands + 1)), 0]} bottom={LINE.post + 0.003} top={LINE.post + 0.003} height={(LINE.postHeight - 0.03) / (2 * LINE.bands + 1)} sides={LINE.sides} color={colour.line} bevel={0.004} outline={false} />
          ))}
          <Blob radius={LINE.post * 1.25} at={[0, LINE.postHeight + 0.01, 0]} color={colour.line} />
        </group>
      ))}

      <Tree at={on(TREE_AT)} height={height - top} colour={colour} />
      <Doll at={on(DOLL_AT)} colour={colour} />

      {/* The players, mid-game, and a gift box with a pink bow (with a smaller one on it), ready for whoever moves. */}
      <Donut at={on(DONUT_AT)} turn={0.3} colour={colour} />
      <Egg at={on(EGG_AT)} turn={-0.2} colour={colour} />
      <Gift at={on(GIFT.at)} turn={0.35} size={GIFT.size} bowed={false} colour={colour} />
      <Gift at={[GIFT.at[0], top + giftTop(GIFT.size), GIFT.at[2]]} turn={-0.15} size={GIFT.top} colour={colour} />
    </group>
  )
}

/** Its shadow covers the court. */
Playground.shadow = 1.1
/** The heights it follows: the tree's top stands at the place's height. */
Playground.heights = [1.6, 2.2] as const
