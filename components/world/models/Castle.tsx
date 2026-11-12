'use client'

import { landmark } from '@/content/sky'
import {
  Blob,
  Block,
  Extruded,
  Flag,
  Glass,
  Lit,
  Peak,
  Ring,
  Tube,
  Turned,
  Water,
  Window,
  archOutline,
  blend,
  ellipseOutline,
  heightWithin,
  peakTop,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/** The castle stands back and to the left, turned a little toward its village on the right. */
const CASTLE = { x: -0.28, z: -0.18, turn: 0.32 }
/** The keep: a square block on a two-step footing, its wall height what the place's height leaves. */
const KEEP = { width: 0.58, footing: 0.05, plinth: 0.06, parapet: 0.06, merlon: 0.07 }
/**
 * The corner towers, set out on the keep's corners: the two at the front
 * stouter and lower under steeper roofs, the two behind slimmer and taller, so
 * no two read as copies. `rise` is how far each stands above the keep's wall.
 */
const TOWERS = {
  front: { radius: 0.11, rise: 0.14, roof: 0.34, overhang: 0.04 },
  back: { radius: 0.092, rise: 0.27, roof: 0.42, overhang: 0.03 },
  out: 0.03,
}
/** The turret on the keep, the tallest roof, and the flagpole on its spire. */
const TURRET = { radius: 0.16, drum: 0.42, roof: 0.5, overhang: 0.045, pole: 0.2 }
/** The gatehouse standing out from the keep's front, and its gate. */
const GATEHOUSE = { width: 0.32, depth: 0.09, height: 0.5, wallShare: 0.55, merlons: 0.08 }
/** The crowned banner on the keep: its length, the gap it keeps over the gatehouse's merlons and under the parapet. */
const BANNER = { length: 0.19, clear: 0.02, underParapet: 0.03 }
const GATE = { width: 0.17, height: 0.27 }

/** The Realm's village: three round huts and a well, in front and to the right of the castle. */
const HUTS: Array<{ at: Vec3; radius: number; wall: number; turn: number }> = [
  { at: [0.28, 0, 0.66], radius: 0.13, wall: 0.2, turn: -0.15 },
  { at: [0.84, 0, 0.34], radius: 0.14, wall: 0.22, turn: -0.9 },
  { at: [0.72, 0, -0.26], radius: 0.12, wall: 0.19, turn: -1.5 },
]
const WELL: Vec3 = [0.55, 0, 0.18]

type Colours = Record<'stone' | 'footing' | 'trim' | 'slit' | 'roof' | 'gold' | 'door' | 'iron' | 'flag' | 'banner' | 'plaster' | 'thatch' | 'thatchEdge' | 'timber' | 'wood', string>

/** A narrow arrow slit, set into a wall facing +Z at `at`: dark, no glass. */
function Slit({ at, rot, colour }: { at: Vec3; rot?: Vec3; colour: Colours }) {
  return <Block size={[0.022, 0.085, 0.02]} at={at} rot={rot} color={colour.slit} bevel={0.006} outline={false} />
}

/**
 * A round tower at `at` on the keep's corner: a slightly battered drum, a
 * moulded rim, a conical roof and a gold spike standing on the roof's true
 * tip, a lit window looking out and arrow slits.
 */
function Tower({ at, radius, height, roof, overhang, out, colour }: { at: Vec3; radius: number; height: number; roof: number; overhang: number; out: number; colour: Colours }) {
  const foot = KEEP.footing - 0.02
  const top = foot + height
  const tip = top - 0.02 + peakTop(radius + overhang, roof, undefined, 14)
  return (
    <group position={at}>
      <Tube top={radius * 0.94} bottom={radius} height={height} at={[0, foot, 0]} sides={14} bevel={0.018} color={colour.stone} />
      <Ring radius={radius * 0.94 + 0.008} thickness={0.03} sides={6} around={14} at={[0, top - 0.035, 0]} color={colour.trim} outline={false} />
      <Peak radius={radius + overhang} height={roof} at={[0, top - 0.02, 0]} sides={14} color={colour.roof} />
      <Block size={[0.012, 0.08, 0.012]} at={[0, tip + 0.025, 0]} color={colour.gold} bevel={0.004} outline={false} />
      <group rotation={[0, out, 0]}>
        <Glass size={[0.034, 0.075, 0.02]} at={[0, foot + height * 0.74, radius * 0.95]} outline={false} />
        <Slit at={[0, foot + height * 0.42, radius * 0.97]} colour={colour} />
      </group>
      <group rotation={[0, out + 1.2, 0]}>
        <Slit at={[0, foot + height * 0.58, radius * 0.96]} colour={colour} />
      </group>
    </group>
  )
}

/**
 * A round hut of the Realm, its door facing `turn`: plaster walls, a steep
 * thatch with a darker lip at its eaves and a timber spike, a framed arched
 * door and a framed window, big enough to read as a small building from the
 * place.
 */
function Hut({ at, radius, wall, turn, colour }: { at: Vec3; radius: number; wall: number; turn: number; colour: Colours }) {
  const roof = radius + 0.06
  const pitch = roof * 1.35
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Tube top={radius - 0.004} bottom={radius} height={wall + 0.02} sides={14} bevel={0.016} color={colour.plaster} />
      {/* The thatch's lip, thick and darker, then the cone above it (whose own line runs round the lip). */}
      <Ring radius={roof - 0.015} thickness={0.035} sides={6} around={16} at={[0, wall + 0.02, 0]} color={colour.thatchEdge} outline={false} />
      <Peak radius={roof} height={pitch} at={[0, wall + 0.02, 0]} sides={14} bevel={0.022} color={colour.thatch} />
      <Block size={[0.014, 0.06, 0.014]} at={[0, wall + 0.02 + peakTop(roof, pitch, 0.022, 14) + 0.015, 0]} color={colour.timber} bevel={0.004} />
      {/* A timber frame round the door, the door in front of it, a step. */}
      <Extruded shape={archOutline(0.1, 0.15, 6)} depth={0.02} at={[0, 0.02, radius - 0.002]} color={colour.timber} />
      <Extruded shape={archOutline(0.072, 0.13, 6)} depth={0.02} at={[0, 0.02, radius + 0.006]} color={colour.door} />
      <Block size={[0.11, 0.02, 0.05]} at={[0, 0.01, radius + 0.03]} color={colour.footing} bevel={0.006} />
      <group rotation={[0, 1.15, 0]}>
        <Window size={[0.05, 0.055]} at={[0, 0.02 + wall * 0.58, radius - 0.008]} frame={colour.timber} bars={false} sill={false} border={0.012} />
      </group>
    </group>
  )
}

/**
 * Kingdoms & Crowns. It is a homeschool platform whose new feature, the
 * Realm, is a village-building game, so its landmark is a castle with that
 * village growing beside it: a crenellated keep with four round towers of
 * different sizes under purple conical roofs, a gatehouse with an arched gate,
 * a turret flying the flag; and in front of it the Realm, three thatched huts
 * round a well, with a pennant and lamps, the liveliest part of the place.
 *
 * Three levels of detail. The main mass: the footing, the keep, the towers,
 * the turret, the three huts. The secondary forms: the plinth course, two
 * string courses, the parapet's merlons, the gatehouse and its own merlons,
 * the gate, its frame and portcullis, slit and lit windows, the towers' rims
 * and roofs. The props: the flag and the village pennant, the crowned banner,
 * the well with its roof, winch and bucket (water in it), lamps on posts, a
 * cart of timber for building, stepping stones from the gate to the well.
 *
 * Everything that stands on something stands on its true top (`peakTop`); the
 * keep's walls take what the place's height leaves under the turret, so the
 * flag flies at the place's height from 1.9 to 2.6 (`Castle.heights`).
 */
export function Castle({ place, district }: ModelProps) {
  const colour: Colours = {
    // Warm sandstone, so the walls do not read as lavender under the blue shade.
    stone: blend(landmark.sand, landmark.stone, 0.45),
    footing: blend(landmark.stone, landmark.slate, 0.38),
    trim: blend(blend(landmark.sand, landmark.stone, 0.45), landmark.slate, 0.25),
    slit: blend(landmark.indigo, landmark.slate, 0.25),
    roof: blend(landmark.purple, landmark.indigo, 0.18),
    gold: landmark.gold,
    door: blend(landmark.wood, landmark.indigo, 0.4),
    iron: blend(landmark.slate, landmark.indigo, 0.55),
    flag: district.color,
    banner: blend(district.color, landmark.coral, 0.35),
    plaster: blend(landmark.cream, district.color, 0.12),
    // Weathered straw: wood lifted toward sand, far from the gold of the finials.
    thatch: blend(blend(landmark.wood, landmark.sand, 0.35), landmark.slate, 0.12),
    thatchEdge: blend(blend(landmark.wood, landmark.sand, 0.2), landmark.indigo, 0.22),
    timber: blend(landmark.wood, landmark.indigo, 0.25),
    wood: landmark.wood,
  }

  const height = heightWithin(place.height, Castle.heights)
  const { width, footing, plinth, parapet, merlon } = KEEP
  const half = width / 2
  // From the top down: the pole's gold knob at the place's height, the pole on the spire's true tip, the spire on the turret, the turret on the keep.
  const knob = 0.016
  const poleTop = height - knob * 2
  const spireTop = poleTop - TURRET.pole
  const spireFoot = spireTop - peakTop(TURRET.radius + TURRET.overhang, TURRET.roof)
  const turretTop = spireFoot + 0.02
  const wallTop = turretTop - TURRET.drum
  const wall = wallTop - footing
  const course = (k: number) => footing + wall * k
  const gateFront = half + GATEHOUSE.depth
  // The gatehouse is a share of the keep's wall (never taller than it was drawn for), so a low keep keeps room above it.
  const gatehouse = Math.min(GATEHOUSE.height, wall * GATEHOUSE.wallShare)
  const gatehouseTop = footing + gatehouse + GATEHOUSE.merlons
  // The banner hangs from under the upper string course, or higher where it must to hang clear of the gatehouse's
  // merlons, but never into the parapet: it is placed from the gatehouse's top, not from a share of the wall.
  const bannerTop = Math.min(wallTop - BANNER.underParapet, Math.max(course(0.78) - 0.02, gatehouseTop + BANNER.clear + BANNER.length))

  return (
    <group>
      <group position={[CASTLE.x, 0, CASTLE.z]} rotation={[0, CASTLE.turn, 0]}>
        {/* The footing, a plinth course, the keep, two string courses and a crenellated parapet. */}
        <Block size={[width + 0.18, footing, width + 0.18]} at={[0, footing / 2, 0]} color={colour.footing} bevel={0.018} />
        <Block size={[width + 0.06, plinth, width + 0.06]} at={[0, footing + plinth / 2, 0]} color={colour.trim} bevel={0.016} />
        <Block size={[width, wall, width]} at={[0, footing + wall / 2, 0]} color={colour.stone} bevel={0.025} />
        {[0.42, 0.78].map((k) => (
          <Block key={k} size={[width + 0.025, 0.028, width + 0.025]} at={[0, course(k), 0]} color={colour.trim} bevel={0.01} />
        ))}
        <Block size={[width + 0.05, parapet, width + 0.05]} at={[0, wallTop + parapet / 2, 0]} color={colour.trim} bevel={0.015} />
        {[0, 1, 2, 3].flatMap((face) =>
          [-0.13, 0, 0.13].map((x) => (
            <group key={`${face}${x}`} rotation={[0, (face * Math.PI) / 2, 0]}>
              <Block size={[0.075, merlon, 0.045]} at={[x, wallTop + parapet + merlon / 2 - 0.004, half]} color={colour.trim} bevel={0.01} />
            </group>
          )),
        )}

        {/* Windows and slits on every face: lit windows high, arrow slits lower. */}
        {[0, 1, 2, 3].map((face) => (
          <group key={face} rotation={[0, (face * Math.PI) / 2, 0]}>
            {(face === 0 ? [-0.17, 0.17] : [-0.1, 0.1]).map((x) => (
              <Glass key={x} size={[0.045, 0.1, 0.02]} at={[x, course(0.88) - 0.07, half]} />
            ))}
            {face !== 0 && <Slit at={[0, course(0.6), half + 0.005]} colour={colour} />}
          </group>
        ))}

        {/* The gatehouse stands out from the front: its own wall, string course and merlons, a banner over the gate. */}
        <Block size={[GATEHOUSE.width, gatehouse, GATEHOUSE.depth + 0.02]} at={[0, footing + gatehouse / 2, half + GATEHOUSE.depth / 2 - 0.01]} color={colour.stone} bevel={0.02} />
        <Block size={[GATEHOUSE.width + 0.03, 0.04, GATEHOUSE.depth + 0.04]} at={[0, footing + gatehouse, half + GATEHOUSE.depth / 2]} color={colour.trim} bevel={0.012} />
        {[-0.115, 0, 0.115].map((x) => (
          <Block key={x} size={[0.06, 0.06, 0.04]} at={[x, footing + gatehouse + 0.05, gateFront - 0.005]} color={colour.trim} bevel={0.01} />
        ))}
        {/* Arrow slits either side of the gate, clear of its frame at every height. */}
        {[-0.138, 0.138].map((x) => (
          <Slit key={x} at={[x, footing + GATE.height * 0.62, gateFront + 0.002]} colour={colour} />
        ))}
        {/* The gate: an arched stone frame, the door standing in front of it within the frame, a portcullis half raised. */}
        <Extruded shape={archOutline(GATE.width + 0.07, GATE.height + 0.045, 8)} depth={0.03} at={[0, footing, gateFront]} color={colour.trim} />
        <Extruded shape={archOutline(GATE.width, GATE.height, 8)} depth={0.024} at={[0, footing, gateFront + 0.016]} color={colour.door} />
        {[-0.05, 0, 0.05].map((x) => (
          <Block key={x} size={[0.01, GATE.height * 0.36, 0.01]} at={[x, footing + GATE.height * 0.8, gateFront + 0.034]} color={colour.iron} bevel={0.003} />
        ))}
        <Block size={[GATE.width * 0.8, 0.01, 0.01]} at={[0, footing + GATE.height * 0.66, gateFront + 0.036]} color={colour.iron} bevel={0.003} />
        <Block size={[GATE.width + 0.14, 0.035, 0.1]} at={[0, 0.0175, gateFront + 0.045]} color={colour.footing} bevel={0.012} />
        {/* The crowned banner, in front of the string courses it may hang across. */}
        <Extruded
          shape={[[-0.055, 0], [0.055, 0], [0.055, -BANNER.length + 0.04], [0, -BANNER.length], [-0.055, -BANNER.length + 0.04]]}
          depth={0.014}
          at={[0, bannerTop, half + 0.021]}
          color={colour.banner}
        />
        <Extruded
          shape={[[-0.032, -0.055], [0.032, -0.055], [0.037, -0.018], [0.016, -0.036], [0, -0.01], [-0.016, -0.036], [-0.037, -0.018]]}
          depth={0.008}
          at={[0, bannerTop, half + 0.031]}
          color={colour.gold}
        />

        {/* Four towers of two sizes, set out on the corners. */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => {
            const t = sz > 0 ? TOWERS.front : TOWERS.back
            return (
              <Tower
                key={`${sx}${sz}`}
                at={[sx * (half + TOWERS.out), 0, sz * (half + TOWERS.out)]}
                radius={t.radius}
                height={wall + t.rise}
                roof={t.roof}
                overhang={t.overhang}
                out={Math.atan2(sx, sz)}
                colour={colour}
              />
            )
          }),
        )}

        {/* The turret on the keep: a drum with a moulded rim, the tallest roof, and the flag on a pole from its tip. */}
        <Tube top={TURRET.radius} bottom={TURRET.radius} height={TURRET.drum + 0.02} at={[0, wallTop - 0.02, 0]} bevel={0.02} color={colour.stone} />
        <Ring radius={TURRET.radius + 0.01} thickness={0.036} sides={6} around={18} at={[0, turretTop - 0.04, 0]} color={colour.trim} />
        <Peak radius={TURRET.radius + TURRET.overhang} height={TURRET.roof} at={[0, spireFoot, 0]} color={colour.roof} />
        <Glass size={[0.045, 0.1, 0.02]} at={[0, wallTop + TURRET.drum * 0.55, TURRET.radius]} />
        <Slit at={[TURRET.radius * Math.sin(1.1), wallTop + TURRET.drum * 0.5, TURRET.radius * Math.cos(1.1)]} rot={[0, 1.1, 0]} colour={colour} />
        <Tube top={0.007} bottom={0.009} height={poleTop - spireTop + 0.03} at={[0, spireTop - 0.03, 0]} bevel={0.003} color={colour.iron} />
        <Blob radius={knob} at={[0, poleTop + knob * 0.6, 0]} color={colour.gold} />
        <Flag size={[0.22, 0.13]} at={[0.008, poleTop - 0.01, 0]} rot={[0, -CASTLE.turn - 0.5, 0]} color={colour.flag} />
      </group>

      {/* The Realm: three huts round a well. */}
      {HUTS.map((hut, i) => (
        <Hut key={i} {...hut} colour={colour} />
      ))}
      <group position={WELL}>
        <Turned profile={[[0, 0], [0.085, 0], [0.085, 0.08], [0.068, 0.08], [0.068, 0.06], [0, 0.06]]} sides={12} color={colour.footing} />
        <Water shape={ellipseOutline(0.068, 0.068, 16)} rings={2} at={[0, 0.062, 0]} />
        {[-1, 1].map((s) => (
          <Block key={s} size={[0.018, 0.17, 0.018]} at={[s * 0.075, 0.08 + 0.085, 0]} color={colour.timber} bevel={0.005} />
        ))}
        <Block size={[0.15, 0.012, 0.012]} at={[0, 0.215, 0]} color={colour.timber} bevel={0.004} />
        <Peak radius={0.12} height={0.09} sides={4} bevel={0.012} at={[0, 0.245, 0]} color={colour.thatch} />
        <Turned profile={[[0, 0], [0.018, 0], [0.022, 0.03], [0, 0.03]]} at={[0.03, 0.15, 0]} color={colour.wood} />
      </group>

      {/* A pennant on a pole and lamps on posts by the huts, a cart of timber for building, stepping stones from the gate. */}
      <Tube top={0.007} bottom={0.009} height={0.5} at={[0.46, 0, 0.46]} bevel={0.003} color={colour.timber} />
      <Flag size={[0.13, 0.07]} at={[0.467, 0.49, 0.46]} rot={[0, -0.6, 0]} color={colour.banner} speed={2.2} />
      {[
        [0.6, 0.64],
        [0.98, 0.04],
      ].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Block size={[0.016, 0.22, 0.016]} at={[0, 0.11, 0]} color={colour.timber} bevel={0.005} />
          <Lit size={[0.035, 0.045, 0.035]} at={[0, 0.24, 0]} color={landmark.lit} />
          <Block size={[0.045, 0.012, 0.045]} at={[0, 0.268, 0]} color={colour.timber} bevel={0.004} />
        </group>
      ))}
      <group position={[0.0, 0, 0.82]} rotation={[0, 0.5, 0]}>
        <Block size={[0.2, 0.04, 0.11]} at={[0, 0.07, 0]} color={colour.wood} bevel={0.008} />
        {[-1, 1].map((s) => (
          <Ring key={s} radius={0.04} thickness={0.012} sides={6} around={14} at={[-0.03, 0.045, s * 0.065]} rot={[Math.PI / 2, 0, 0]} color={colour.timber} outline={false} />
        ))}
        {[0, 1, 2].map((k) => (
          <Block key={k} size={[0.22, 0.026, 0.026]} at={[0, 0.105 + (k % 2) * 0.024, (k - 1) * 0.03]} bevel={0.008} color={k === 1 ? colour.timber : colour.wood} outline={false} />
        ))}
      </group>
      {[
        [0.02, 0.32, 0.2],
        [0.16, 0.31, -0.3],
        [0.3, 0.28, 0.4],
        [0.43, 0.24, 0.1],
      ].map(([x, z, r], i) => (
        <Block key={i} size={[0.085, 0.025, 0.065]} at={[x, 0.0125, z]} rot={[0, r, 0]} color={colour.footing} bevel={0.01} />
      ))}
    </group>
  )
}

/** Its shadow reaches under the village as well as the castle. */
Castle.shadow = 1.1
/** The heights it follows: the keep's walls take up the difference under the turret. */
Castle.heights = [1.9, 2.6] as const
