'use client'

import { Euler, Vector3 } from 'three'
import { landmark } from '@/content/sky'
import { Blob, Block, Extruded, Ring, Rounded, Swept, Tube, Turned, blend, ellipseOutline, pointing, smileOutline, turnedTop, type Point2, type Vec3 } from './kit'

/*
 * Pip, the goblin bard of dnd4noobs, sitting at the tavern's door. Built round
 * her seat (the top of whatever she sits on), facing +Z, at her own size: from
 * her seat to the tip of her hat is `SITTING` model units, and `scale` sizes
 * every part from there (each part is given its real size, never scaled as a
 * group, so her lines and bevels stay as fine as the kit's). Her look is the
 * portrait's: a rounded green head with long ears angled out and gold hoops
 * in them, a wide purple hat with a gold buckle and a blue-to-purple feather,
 * a purple cloak over a cream shirt, a belt, dark breeches and boots, and a
 * lute held across her body, one hand on its neck and the other strumming.
 */


/** Her breeches, sitting: the seat, and each leg's thigh forward and shin hanging down, [x, y, z] from the seat. */
const LEGS = { seat: [0.046, 0.022, 0.042] as Vec3, x: 0.012, knee: [0.01, 0.042] as [number, number], foot: [-0.036, 0.048] as [number, number], thick: 0.0085 }
/** Her boots, at the foot of each shin. */
const BOOT: Vec3 = [0.018, 0.014, 0.026]
/** Her shirt and its belt, and her cloak: a cape over her shoulders and its fall down her back. */
const SHIRT = { size: [0.036, 0.046, 0.028] as Vec3, y: 0.042 }
const BELT = { size: [0.038, 0.007, 0.03] as Vec3, y: 0.024 }
const CAPE = { size: [0.066, 0.026, 0.042] as Vec3, y: 0.05, z: 0.001 }
const CLOAK = { size: [0.058, 0.06, 0.016] as Vec3, y: 0.036, z: -0.015 }
/** Her head: rounded, a little wider than tall, her nose, her big dark eyes with a catch of light in each, her grin, and the fringe of hair under her hat's brim. */
const HEAD = { size: [0.054, 0.046, 0.046] as Vec3, y: 0.092, z: 0.003 }
const EYE = { x: 0.011, y: 0.094, z: 0.0215, radius: 0.0066 }
const GRIN = { y: -0.0135, z: 0.0195, size: [0.015, 0.0032] as [number, number], tilt: 0.5 }
const FRINGE: Vec3 = [0.048, 0.013, 0.02]
/** Her ears: long and pointed, angled out and a little up and back, from the sides of her head. */
const EAR = { path: [[0.024, 0.093, 0], [0.046, 0.099, -0.004], [0.069, 0.108, -0.011]] as Vec3[], widths: [[0.02, 0.006], [0.013, 0.005], [0.004, 0.003]] as Point2[] }
/** The gold hoop hanging from the lower edge of each ear. */
const HOOP = { x: 0.035, y: 0.082, radius: 0.0055, thick: 0.0018 }
/** Her hat: a wide brim, a soft rounded crown, the whole tipped back and to one side, a gold buckle, a feather sweeping out from its side. */
const HAT = { y: 0.112, tilt: [-0.28, 0, 0.14] as Vec3, brim: 0.052, brimThick: 0.005, crown: [[0, 0], [0.025, 0], [0.024, 0.01], [0.019, 0.022], [0.01, 0.031], [0, 0.034]] as Point2[], crownOn: 0.6, crownBevel: 0.003, crownSides: 12 }
/**
 * From her seat to the tip of her hat (its crown's true top, the hat tipped
 * as she wears it; the feather aside), at scale 1. Every part scales with
 * her, so at `scale` it is `SITTING * scale`.
 */
export const SITTING = HAT.y + new Vector3(0, HAT.brimThick * HAT.crownOn + turnedTop(HAT.crown, HAT.crownBevel, HAT.crownSides), 0).applyEuler(new Euler(...HAT.tilt)).y
/** The feather: its purple root from the hat's side, then its blue tip, sweeping out, up and back. */
const FEATHER = {
  root: [[-0.02, 0.008, 0.002], [-0.038, 0.026, -0.006], [-0.054, 0.046, -0.016]] as Vec3[],
  tip: [[-0.054, 0.046, -0.016], [-0.067, 0.064, -0.028], [-0.072, 0.084, -0.042]] as Vec3[],
  rootWidths: [[0.005, 0.0018], [0.016, 0.0022], [0.019, 0.0022]] as Point2[],
  tipWidths: [[0.019, 0.0022], [0.016, 0.0022], [0.005, 0.0018]] as Point2[],
  facing: [0.4, 0, 1] as Vec3,
}
/** Her arms, [shoulder, elbow, hand], one hand on the lute's neck and the other strumming over its body. */
const ARMS: Array<[Vec3, Vec3, Vec3]> = [
  [[-0.021, 0.058, 0], [-0.033, 0.043, 0.012], [-0.03, 0.057, 0.027]],
  [[0.021, 0.058, 0], [0.031, 0.036, 0.013], [0.012, 0.029, 0.031]],
]
const ARM = 0.0068
const HAND = 0.0068
/** The lute, held across her: its body low on her right, its neck rising to her left (`turn` about the front). */
const LUTE = { at: [0.006, 0.03, 0.024] as Vec3, turn: 0.93, body: 0.02, squash: [0.85, 1.1, 0.45] as Vec3, neck: [0.007, 0.05, 0.004] as Vec3, head: [0.009, 0.015, 0.005] as Vec3 }

/** A part's size or place at `s` times her own. */
const sized = (v: Vec3, s: number) => v.map((n) => n * s) as Vec3

/** A side's mirror of a point: `side` -1 mirrors it across her middle. */
const mirrored = ([x, y, z]: Vec3, side: number): Vec3 => [side * x, y, z]

/** A soft round limb `radius` thick from `from` to `to`: a ball stretched along it, its rounded ends overlapping the next. */
function Limb({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const { rot, length } = pointing(from, to)
  const middle = from.map((v, i) => (v + to[i]) / 2) as Vec3
  return <Blob radius={radius} squash={[1, (length / 2 + radius * 0.5) / radius, 1]} at={middle} rot={rot} color={color} />
}

/** Pip, sitting: built round her seat, facing +Z, every part `scale` times her own size. */
export function Pip({ scale = 1 }: { scale?: number }) {
  const s = scale
  const colour = {
    // A warm yellow-green, as the portrait's.
    skin: blend(landmark.green, landmark.gold, 0.32),
    // A true purple: the palette's blue-violet warmed with pink, deepened toward indigo.
    purple: blend(blend(landmark.purple, landmark.pink, 0.3), landmark.indigo, 0.3),
    shirt: blend(landmark.cream, landmark.orange, 0.12),
    dark: landmark.indigo,
    // Dark leather: her boots, her belt, and the lute's neck and pegbox.
    leather: blend(landmark.wood, landmark.indigo, 0.6),
    gold: landmark.gold,
    lute: landmark.wood,
    featherRoot: blend(landmark.purple, landmark.pink, 0.25),
    featherTip: blend(landmark.blue, landmark.sky, 0.15),
  }
  const at = (v: Vec3) => sized(v, s)

  return (
    <group>
      {/* Sitting: breeches over the seat, thighs forward and shins hanging, boots. */}
      <Rounded size={at(LEGS.seat)} round={0.7} at={at([0, LEGS.seat[1] / 2, 0])} color={colour.dark} />
      {[-1, 1].map((side) => {
        const hip: Vec3 = [side * LEGS.x, 0.01, 0.004]
        const knee: Vec3 = [side * (LEGS.x + 0.001), LEGS.knee[0], LEGS.knee[1]]
        const foot: Vec3 = [side * (LEGS.x + 0.002), LEGS.foot[0], LEGS.foot[1]]
        return (
          <group key={side}>
            <Limb from={at(hip)} to={at(knee)} radius={LEGS.thick * s} color={colour.dark} />
            <Limb from={at(knee)} to={at(foot)} radius={LEGS.thick * s * 0.9} color={colour.dark} />
            <Rounded size={at(BOOT)} round={0.7} at={at([foot[0], foot[1] - 0.004, foot[2] + 0.006])} color={colour.leather} />
          </group>
        )
      })}

      {/* Her shirt and belt, and the cloak over her shoulders and down her back. */}
      <Rounded size={at(SHIRT.size)} round={0.65} at={at([0, SHIRT.y, 0])} color={colour.shirt} />
      <Rounded size={at(BELT.size)} round={0.6} at={at([0, BELT.y, 0])} color={colour.leather} />
      <Rounded size={at(CAPE.size)} round={0.7} at={at([0, CAPE.y, CAPE.z])} color={colour.purple} />
      <Rounded size={at(CLOAK.size)} round={0.6} at={at([0, CLOAK.y, CLOAK.z])} color={colour.purple} />

      {/* Her head: nose, eyes, grin, the fringe under her brim, the long ears with their hoops. */}
      <Rounded size={at(HEAD.size)} round={0.85} at={at([0, HEAD.y, HEAD.z])} color={colour.skin} />
      <Blob radius={0.006 * s} squash={[1, 0.8, 1.2]} at={at([0, HEAD.y - 0.006, HEAD.z + 0.023])} color={colour.skin} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Blob radius={EYE.radius * s} squash={[0.7, 1.1, 0.4]} at={at([side * EYE.x, EYE.y, HEAD.z + EYE.z])} color={colour.dark} outline={false} />
          <Blob radius={EYE.radius * 0.32 * s} at={at([side * EYE.x + 0.0018, EYE.y + 0.0025, HEAD.z + EYE.z + 0.0022])} color={colour.shirt} outline={false} />
        </group>
      ))}
      <Extruded shape={smileOutline(...GRIN.size.map((n) => n * s) as [number, number])} depth={0.0012 * s} bevel={0.0004 * s} at={at([0, HEAD.y + GRIN.y, HEAD.z + GRIN.z])} rot={[GRIN.tilt, 0, 0]} color={colour.dark} outline={false} />
      <Rounded size={at(FRINGE)} round={0.8} at={at([0, HEAD.y + 0.017, HEAD.z + 0.012])} color={colour.dark} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Swept path={EAR.path.map((p) => at(mirrored(p, side)))} widths={EAR.widths.map(([w, t]) => [w * s, t * s] as Point2)} sides={6} steps={6} color={colour.skin} />
          <Ring radius={HOOP.radius * s} thickness={HOOP.thick * s} sides={4} around={10} at={at([side * HOOP.x, HOOP.y, -0.001])} rot={[Math.PI / 2, 0, 0]} color={colour.gold} />
        </group>
      ))}

      {/* Her hat, tipped back and to one side: brim, crown, buckle, feather. */}
      <group position={at([0, HAT.y, HEAD.z])} rotation={HAT.tilt}>
        <Tube top={HAT.brim * s} bottom={HAT.brim * s} height={HAT.brimThick * s} bevel={0.002 * s} color={colour.purple} />
        <Turned profile={HAT.crown.map(([r, y]) => [r * s, y * s] as Point2)} at={at([0, HAT.brimThick * HAT.crownOn, 0])} bevel={HAT.crownBevel * s} sides={HAT.crownSides} color={colour.purple} />
        <Block size={at([0.012, 0.01, 0.003])} bevel={0.001 * s} at={at([0, 0.012, 0.0245])} rot={[-0.06, 0, 0]} color={colour.gold} />
        <Swept path={FEATHER.root.map(at)} widths={FEATHER.rootWidths.map(([w, t]) => [w * s, t * s] as Point2)} facing={FEATHER.facing} sides={5} steps={6} color={colour.featherRoot} />
        <Swept path={FEATHER.tip.map(at)} widths={FEATHER.tipWidths.map(([w, t]) => [w * s, t * s] as Point2)} facing={FEATHER.facing} sides={5} steps={6} color={colour.featherTip} />
      </group>

      {/* Her arms in their shirt sleeves, and her hands on the lute. */}
      {ARMS.map(([shoulder, elbow, hand], i) => (
        <group key={i}>
          <Limb from={at(shoulder)} to={at(elbow)} radius={ARM * s} color={colour.shirt} />
          <Limb from={at(elbow)} to={at(hand)} radius={ARM * s * 0.9} color={colour.shirt} />
          <Blob radius={HAND * s} at={at(hand)} color={colour.skin} />
        </group>
      ))}

      {/* The lute, across her: a rounded body with its sound hole, the neck, the pegbox bent back. */}
      <group position={at(LUTE.at)} rotation={[0, 0, LUTE.turn]}>
        <Blob radius={LUTE.body * s} squash={LUTE.squash} color={colour.lute} />
        <Extruded shape={ellipseOutline(0.0045 * s, 0.0045 * s, 12)} depth={0.001 * s} at={at([0, 0.004, LUTE.body * LUTE.squash[2] - 0.0002])} color={colour.dark} outline={false} />
        <Block size={at(LUTE.neck)} bevel={0.0015 * s} at={at([0, LUTE.body * 0.8 + LUTE.neck[1] / 2, 0.002])} color={colour.leather} />
        <Block size={at(LUTE.head)} bevel={0.0015 * s} at={at([0, LUTE.body * 0.8 + LUTE.neck[1] + LUTE.head[1] / 2 - 0.002, -0.001])} rot={[-0.5, 0, 0]} color={colour.leather} />
      </group>
    </group>
  )
}
