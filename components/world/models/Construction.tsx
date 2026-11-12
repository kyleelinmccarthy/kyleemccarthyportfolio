'use client'

import { landmark } from '@/content/sky'
import { Block, Door, Glass, Lit, Peak, Sway, Truss, Tube, Window, blend, heightWithin, peakTop, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The pad of compacted ground the building, its scaffold and the crane stand on. */
const PAD = { x: -0.065, z: 0.02, width: 1.35, depth: 1.0, height: 0.03 }
/**
 * The unfinished building, back and to the left: its middle, its width and
 * depth, a storey's height and a floor slab's thickness. Three storeys are up;
 * the roof slab is poured over half of it.
 */
const BUILDING = { x: -0.3, z: 0.08, width: 0.7, depth: 0.52, storey: 0.34, slab: 0.04, storeys: 3, column: 0.05 }
/** The scaffold along its front: how far out its two rows of standards stand, its bays, a tube's thickness. */
const SCAFFOLD = { inner: 0.04, outer: 0.12, bays: 3, tube: 0.014, rail: 0.1 }
/**
 * The tower crane, beside the building at the back right: its footing, a
 * lattice mast (`bay` its panels' height, twice its width), the slewing unit
 * (`turntable`) on top and the peak above it; the jib reaching out over the
 * building, the counter-jib with its weights behind. The mast takes what the
 * place's height leaves under the slewing unit and the peak.
 *
 * Where it stands, the jib's length and the footprint go together: the mast
 * stands 0.47 from the landmark's middle, and the jib reaches `JIB.from +
 * JIB.length` (0.75) past it, so as the jib slews it sweeps out to 1.23 of
 * the 1.27 this place allows (`footprintRadius`). Move the crane out or
 * lengthen the jib and the landmark test's swept check fails.
 */
const CRANE = {
  x: 0.36,
  z: -0.3,
  footing: { width: 0.24, height: 0.06 },
  mast: { width: 0.11, bay: 0.22 },
  turntable: { height: 0.05, top: 0.085, bottom: 0.09 },
  peak: { radius: 0.07, height: 0.3 },
  /** The floodlight on the mast's front, this far under its top. */
  floodlight: 0.14,
}
const JIB = { width: 0.08, length: 0.72, bays: 9, from: 0.03 }
const COUNTER_JIB = { length: 0.28, bays: 3 }
/** The counterweight hung at the counter-jib's end, its top this far under the jib's foot. */
const COUNTERWEIGHT = { size: [0.09, 0.13, 0.11] as Vec3, inset: 0.02, drop: 0.05 }
/** The cab at the jib's root, beside the mast, its window looking out along the jib. */
const CAB = { size: [0.1, 0.09, 0.08] as Vec3, x: 0.05, z: 0.1, window: [0.06, 0.05] as [number, number] }
/**
 * How far along the jib the trolley stands, and the height the load hangs at,
 * just clear of the rebar on the roof slab; the trolley's size, and the hook
 * block's.
 */
const TROLLEY = { at: 0.5, hook: 1.42, size: [0.07, 0.025, 0.07] as Vec3, block: [0.04, 0.05, 0.03] as Vec3 }
/** The load: a bundle of steel beams, its slings reaching out and down to its ends. */
const LOAD = { size: [0.28, 0.045, 0.08] as Vec3, sling: [0.1, 0.08] as [number, number] }
/** Props on the ground: cones, the barrier at the front, the stack of steel by the crane. */
const CONES: Vec3[] = [
  [0.18, 0, 0.62],
  [0.4, 0, 0.6],
  [-0.82, 0, 0.55],
]
const BARRIER = { x: -0.3, z: 0.64, width: 0.38, posts: 0.16, height: 0.14 }
const STEEL = { x: 0.35, z: 0.1, turn: 0.4, length: 0.3, bar: 0.03 }
/** The site cabin, front right: where it stands and its turn, its size, and the blocks it stands on. */
const CABIN = { x: 0.85, z: 0.2, turn: -0.5, size: [0.34, 0.2, 0.2] as Vec3, foot: 0.03 }
/** The slew: a slow swing to and fro, about the mast. */
const SLEW = { amount: 0.45, speed: 0.12 }
/** The load rocks a little on its slings as it hangs. */
const ROCK = { amount: 0.06, speed: 0.7 }

type Colours = Record<'crane' | 'concrete' | 'ground' | 'walls' | 'metal' | 'wood' | 'accent' | 'white' | 'rebar' | 'door' | 'tarp', string>

/** A bar from `from` to `to` in the XY plane, `z` out: a pendant line, a scaffold brace. */
function Brace({ from, to, z, thickness, color, outline = false }: { from: [number, number]; to: [number, number]; z: number; thickness: number; color: string; outline?: boolean }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const turn = Math.atan2(to[1] - from[1], to[0] - from[0])
  return (
    <Block
      size={[length, thickness, thickness]}
      at={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]}
      rot={[0, 0, turn]}
      color={color}
      bevel={thickness * 0.3}
      outline={outline}
    />
  )
}

/** A storey of the building's frame: its columns, standing on the slab at `y`. */
function Frame({ y, colour }: { y: number; colour: Colours }) {
  const { width, depth, storey, slab, column } = BUILDING
  const xs = [-width / 2 + column / 2 + 0.01, 0, width / 2 - column / 2 - 0.01]
  const zs = [-depth / 2 + column / 2 + 0.01, depth / 2 - column / 2 - 0.01]
  return (
    <>
      {xs.flatMap((x) => zs.map((z) => <Block key={`${x}${z}`} size={[column, storey - slab + 0.01, column]} at={[x, y + (storey - slab) / 2, z]} color={colour.concrete} bevel={0.01} />))}
    </>
  )
}

/** A traffic cone: an orange cone with a white band on a square foot. */
function Cone({ at, colour }: { at: Vec3; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.06, 0.012, 0.06]} at={[0, 0.006, 0]} color={colour.accent} bevel={0.004} />
      <Peak radius={0.026} height={0.085} at={[0, 0.01, 0]} sides={10} bevel={0.006} color={colour.accent} />
      <Tube top={0.014} bottom={0.017} height={0.014} at={[0, 0.04, 0]} sides={10} bevel={0.003} color={colour.white} outline={false} />
    </group>
  )
}

/**
 * Also on the go. It is the work still under way, three projects in
 * progress, so its landmark is a building site: an unfinished building in its
 * concrete frame with scaffolding up the front, and a tower crane slowly
 * swinging its jib over it with a load of steel hanging from the hook.
 *
 * Three levels of detail. The main mass: the building's frame and slabs, the
 * crane's mast and jib. The secondary forms: the glazed ground floor and the
 * glass going in on the first, formwork, the scaffold's standards, rails,
 * planks, toe boards and braces, the slewing unit, the cab, the peak and its
 * pendant lines, the counter-jib and its weights, the trolley and hook. The
 * props: rebar standing out of the roof slab, a pallet of bricks, a stack of
 * steel, cones and a barrier, the site cabin with its lamp.
 *
 * The crane is built from the ground up: its mast takes what the place's
 * height leaves under the slewing unit and the peak, so the peak's tip stands
 * at the place's height, from 1.9 to 2.5 (`Construction.heights`); the hook's
 * cable is as long as the mast leaves it, so the load always hangs just over
 * the building. The jib slews slowly to and fro and the load rocks a little
 * (still under reduced motion).
 */
export function Construction({ place, district }: ModelProps) {
  const colour: Colours = {
    crane: landmark.gold,
    // Fresh concrete, warm with sand, so the frame stands apart from the grey buildings behind it.
    concrete: blend(blend(landmark.stone, landmark.sand, 0.55), landmark.slate, 0.3),
    ground: blend(landmark.sand, landmark.stone, 0.5),
    walls: blend(district.color, landmark.cream, 0.6),
    metal: blend(landmark.slate, landmark.indigo, 0.35),
    wood: landmark.wood,
    accent: landmark.orange,
    white: landmark.offWhite,
    rebar: landmark.brick,
    door: blend(district.color, landmark.indigo, 0.45),
    // A site's blue sheeting: the district's own blue, softened toward the palette's sky.
    tarp: blend(district.color, landmark.sky, 0.3),
  }

  const height = heightWithin(place.height, Construction.heights)
  const peakTip = peakTop(CRANE.peak.radius, CRANE.peak.height, undefined, 4)
  const turntable = CRANE.turntable.height
  const mastTop = height - peakTip - turntable
  const mast = mastTop - CRANE.footing.height
  const slewY = mastTop + turntable
  // The jib's chords: a three-sided girder laid along the jib with its third chord on top, its lower two on the slewing unit.
  const jibReach = JIB.width / Math.sqrt(3)
  const jibAxis = slewY + jibReach / 2 + 0.007
  const jibTop = jibAxis + jibReach
  // It points at the building at rest, and swings either way from there.
  const toBuilding = Math.atan2(-(BUILDING.z - CRANE.z), BUILDING.x - CRANE.x)
  // The trolley runs under the jib's lower chords; the cable drops from its underside to the hook block.
  const trolleyY = slewY - TROLLEY.size[1] / 2
  const hookY = TROLLEY.hook
  const cable = trolleyY - TROLLEY.size[1] / 2 - hookY

  const { width, depth, storey, slab, storeys } = BUILDING
  const front = depth / 2
  const levels = Array.from({ length: storeys + 1 }, (_, k) => k * storey)
  const roofY = levels[storeys]

  return (
    <group>
      {/* The site: a pad of compacted ground under the building and the crane. */}
      <Block size={[PAD.width, PAD.height, PAD.depth]} at={[PAD.x, PAD.height / 2, PAD.z]} color={colour.ground} bevel={0.012} />

      {/* The building: slabs and columns, three storeys up; the roof slab poured over the left half. */}
      <group position={[BUILDING.x, 0, BUILDING.z]}>
        {levels.slice(0, storeys).map((y) => (
          <Block key={y} size={[width + 0.04, slab, depth + 0.04]} at={[0, y + slab / 2 + 0.03, 0]} color={colour.concrete} bevel={0.012} />
        ))}
        <Block size={[width / 2 + 0.06, slab, depth + 0.04]} at={[-width / 4 + 0.01, roofY + slab / 2 + 0.03, 0]} color={colour.concrete} bevel={0.012} />
        {levels.slice(0, storeys).map((y) => (
          <Frame key={y} y={y + slab + 0.03} colour={colour} />
        ))}
        {/* The ground floor is closed in: walls at the sides and back, glass and a door at the front. */}
        {[-1, 1].map((s) => (
          <Block key={s} size={[0.03, storey - slab, depth - 0.1]} at={[s * (width / 2 - 0.035), slab + 0.03 + (storey - slab) / 2, 0]} color={colour.walls} bevel={0.01} />
        ))}
        <Block size={[width - 0.1, storey - slab, 0.03]} at={[0, slab + 0.03 + (storey - slab) / 2, -front + 0.035]} color={colour.walls} bevel={0.01} />
        {[-1, 1].map((s) => (
          <Glass key={s} size={[width / 2 - 0.1, storey - slab - 0.06, 0.02]} at={[s * (width / 4), slab + 0.03 + (storey - slab) / 2, front - 0.03]} />
        ))}
        <Door size={[0.1, 0.2]} at={[0, slab + 0.03, front - 0.04]} color={colour.door} frame={colour.white} step={colour.concrete} border={0.02} />
        {/* The first floor: glass going in on the left, formwork on the right. */}
        <Glass size={[width / 2 - 0.1, storey - slab - 0.06, 0.02]} at={[-width / 4, storey + slab + 0.03 + (storey - slab) / 2, front - 0.03]} />
        <Block size={[width / 2 - 0.1, storey - slab - 0.04, 0.02]} at={[width / 4, storey + slab + 0.03 + (storey - slab) / 2, front - 0.03]} color={colour.wood} bevel={0.006} />
        {/* Rebar standing up out of the roof slab where the next columns will go, and boxes of formwork for them. */}
        {[-width / 2 + 0.035, 0].map((x) =>
          [-front + 0.035, front - 0.035].map((z) => (
            <group key={`${x}${z}`} position={[x, roofY + slab + 0.03, z]}>
              {[-0.012, 0.012].map((d) => (
                <Block key={d} size={[0.007, 0.1, 0.007]} at={[d, 0.05, d]} color={colour.rebar} bevel={0.002} outline={false} />
              ))}
            </group>
          )),
        )}
        <Block size={[0.07, 0.12, 0.07]} at={[-width / 2 + 0.17, roofY + slab + 0.09, 0.02]} color={colour.wood} bevel={0.008} />
        {/* A pallet of bricks on the open storey. */}
        <group position={[0.18, 2 * storey + slab + 0.03, -0.06]}>
          <Block size={[0.13, 0.02, 0.1]} at={[0, 0.01, 0]} color={colour.wood} bevel={0.005} />
          <Block size={[0.11, 0.07, 0.08]} at={[0, 0.055, 0]} color={colour.rebar} bevel={0.008} />
        </group>
      </group>

      <Scaffold colour={colour} />

      {/* The crane: a footing, the lattice mast, and the slewing top. */}
      <group position={[CRANE.x, 0, CRANE.z]}>
        <Block size={[CRANE.footing.width, CRANE.footing.height, CRANE.footing.width]} at={[0, CRANE.footing.height / 2, 0]} color={colour.concrete} bevel={0.016} />
        {/* The mast: its bars are finer than a line at this distance, so it draws none (nor does the counter-jib). */}
        <Truss
          height={mast + 0.004}
          width={CRANE.mast.width}
          bays={Math.round(mast / CRANE.mast.bay)}
          at={[0, CRANE.footing.height - 0.002, 0]}
          color={colour.crane}
          outline={false}
        />
        <Floodlight at={[0, mastTop - CRANE.floodlight, CRANE.mast.width / 2]} colour={colour} />
        <Sway at={[0, mastTop, 0]} axis="y" amount={SLEW.amount} speed={SLEW.speed}>
          <group rotation={[0, toBuilding, 0]}>
            <Tube
              top={CRANE.turntable.top}
              bottom={CRANE.turntable.bottom}
              height={turntable + 0.004}
              at={[0, -0.002, 0]}
              sides={8}
              bevel={0.01}
              color={colour.metal}
            />
            <Peak radius={CRANE.peak.radius} height={CRANE.peak.height} at={[0, turntable, 0]} sides={4} bevel={0.012} color={colour.crane} />
            {/* The jib reaching out over the building, the counter-jib behind with its weights. */}
            <Truss height={JIB.length} width={JIB.width} sides={3} bays={JIB.bays} at={[JIB.from, jibAxis - mastTop, 0]} rot={[Math.PI / 2, 0, -Math.PI / 2]} color={colour.crane} />
            <Truss
              height={COUNTER_JIB.length}
              width={JIB.width}
              sides={3}
              bays={COUNTER_JIB.bays}
              at={[-JIB.from, jibAxis - mastTop, 0]}
              rot={[Math.PI / 2, 0, Math.PI / 2]}
              color={colour.crane}
              outline={false}
            />
            <Block
              size={COUNTERWEIGHT.size}
              at={[-COUNTER_JIB.length + COUNTERWEIGHT.inset, turntable - COUNTERWEIGHT.drop, 0]}
              color={colour.concrete}
              bevel={0.012}
            />
            {/* The pendant lines from the peak's tip to the jib and the counter-jib. */}
            <Brace from={[0, turntable + peakTip - 0.02]} to={[JIB.from + JIB.length * 0.62, jibTop - mastTop]} z={0} thickness={0.008} color={colour.metal} />
            <Brace from={[0, turntable + peakTip - 0.02]} to={[-COUNTER_JIB.length + COUNTERWEIGHT.inset, jibTop - mastTop]} z={0} thickness={0.008} color={colour.metal} />
            {/* The cab at the jib's root, standing on the slewing unit, its window looking out along the jib. */}
            <Block size={CAB.size} at={[CAB.x, turntable + CAB.size[1] / 2 - 0.002, CAB.z]} color={colour.white} bevel={0.014} />
            <Glass
              size={[CAB.window[0], CAB.window[1], 0.012]}
              at={[CAB.x + CAB.size[0] / 2, turntable + CAB.size[1] / 2 + 0.005, CAB.z]}
              rot={[0, Math.PI / 2, 0]}
              outline={false}
            />
            {/* The trolley under the jib, the cable and the hook. */}
            <Block size={TROLLEY.size} at={[TROLLEY.at, trolleyY - mastTop, 0]} color={colour.metal} bevel={0.008} />
            <Block size={[0.006, cable, 0.006]} at={[TROLLEY.at, hookY + cable / 2 - mastTop, 0]} color={colour.metal} bevel={0.002} outline={false} />
            <Block size={TROLLEY.block} at={[TROLLEY.at, hookY - 0.02 - mastTop, 0]} color={colour.accent} bevel={0.008} />
            {/* The load: a bundle of steel beams on two slings, rocking a little. */}
            <Sway at={[TROLLEY.at, hookY - TROLLEY.block[1] + 0.005 - mastTop, 0]} axis="z" amount={ROCK.amount} speed={ROCK.speed}>
              {[-1, 1].map((s) => (
                <Brace key={s} from={[0, 0]} to={[s * LOAD.sling[0], -LOAD.sling[1]]} z={0} thickness={0.006} color={colour.metal} />
              ))}
              <Block size={LOAD.size} at={[0, -LOAD.sling[1] - LOAD.size[1] / 2 + 0.0025, 0]} color={colour.door} bevel={0.01} />
            </Sway>
          </group>
        </Sway>
      </group>

      <SiteCabin colour={colour} />

      {/* Props: cones and a barrier at the front, a stack of steel by the crane. */}
      {CONES.map((at) => (
        <Cone key={at[0]} at={at} colour={colour} />
      ))}
      <Barrier colour={colour} />
      <group position={[STEEL.x, PAD.height, STEEL.z]} rotation={[0, STEEL.turn, 0]}>
        {/* Two bars side by side, and one on top across the gap between them. */}
        {[
          [0, -0.5],
          [0, 0.5],
          [1, 0],
        ].map(([row, side]) => (
          <Block
            key={`${row}${side}`}
            size={[STEEL.length, STEEL.bar, STEEL.bar]}
            at={[0, STEEL.bar * (row + 0.5), side * (STEEL.bar + 0.01)]}
            color={colour.door}
            bevel={0.006}
          />
        ))}
      </group>
    </group>
  )
}

/** A floodlight on a short arm off the mast's face at `at`, tilted down to light the site at night. */
function Floodlight({ at, colour }: { at: Vec3; colour: Colours }) {
  return (
    <group position={at}>
      <Block size={[0.012, 0.012, 0.05]} at={[0, 0, 0.02]} color={colour.metal} bevel={0.004} outline={false} />
      <Lit size={[0.05, 0.035, 0.025]} at={[0, 0, 0.05]} rot={[0.4, 0, 0]} color={landmark.lit} />
    </group>
  )
}

/** The barrier at the front: a striped rail on two white posts. */
function Barrier({ colour }: { colour: Colours }) {
  const { x, z, width, posts, height } = BARRIER
  return (
    <group position={[x, 0, z]}>
      {[-posts, posts].map((px) => (
        <Block key={px} size={[0.025, height, 0.025]} at={[px, height / 2, 0]} color={colour.white} bevel={0.006} />
      ))}
      <Block size={[width, 0.04, 0.018]} at={[0, height - 0.02, 0]} color={colour.accent} bevel={0.006} />
    </group>
  )
}

/**
 * The scaffold up the building's front: two rows of standards, a planked
 * lift at every slab with a guard rail and an orange toe board, ledgers, and
 * a brace across its face.
 */
function Scaffold({ colour }: { colour: Colours }) {
  const { x, z, width, depth, storey, slab, storeys } = BUILDING
  const { inner, outer, bays, tube, rail } = SCAFFOLD
  const span = width + 0.06
  const xs = Array.from({ length: bays + 1 }, (_, k) => -span / 2 + (k * span) / bays)
  const rows = [depth / 2 + inner, depth / 2 + outer]
  const lifts = Array.from({ length: storeys }, (_, k) => (k + 1) * storey + slab + 0.03)
  const top = lifts[lifts.length - 1] + rail + 0.04
  return (
    <group position={[x, 0, z]}>
      {xs.flatMap((sx) => rows.map((sz) => <Block key={`${sx}${sz}`} size={[tube, top - 0.03, tube]} at={[sx, 0.03 + (top - 0.03) / 2, sz]} color={colour.metal} bevel={0.004} />))}
      {lifts.map((y) => (
        <group key={y}>
          <Block size={[span + 0.03, 0.014, outer - inner + 0.03]} at={[0, y, (rows[0] + rows[1]) / 2]} color={colour.wood} bevel={0.005} />
          <Block size={[span + 0.03, 0.03, 0.008]} at={[0, y + 0.022, rows[1] + 0.012]} color={colour.accent} bevel={0.003} outline={false} />
          <Block size={[span + 0.02, tube, tube]} at={[0, y + rail, rows[1]]} color={colour.metal} bevel={0.004} />
        </group>
      ))}
      <Block size={[span + 0.02, tube, tube]} at={[0, 0.03 + 0.12, rows[1]]} color={colour.metal} bevel={0.004} />
      <Brace from={[xs[0], 0.06]} to={[xs[bays], lifts[lifts.length - 1] - 0.02]} z={rows[1] + 0.012} thickness={0.012} color={colour.metal} outline />
      {/* Sheeting tied over the top storey's right-hand bay, where the bricks are going in. */}
      <Block
        size={[xs[bays] - xs[bays - 1] - 0.01, lifts[storeys - 1] - lifts[storeys - 2] - 0.05, 0.008]}
        at={[(xs[bays] + xs[bays - 1]) / 2, (lifts[storeys - 1] + lifts[storeys - 2]) / 2 + 0.01, rows[1] + 0.022]}
        color={colour.tarp}
        bevel={0.003}
      />
    </group>
  )
}

/** The site cabin, front right: a blue box with a window, a door and a lamp over it, on blocks. */
function SiteCabin({ colour }: { colour: Colours }) {
  const { size, foot } = CABIN
  const door = { x: 0.1, size: [0.07, 0.14] as [number, number], border: 0.016 }
  // The door's step stands out on the cabin's floor level: a concrete block under it carries it down to the ground.
  const step = { width: door.size[0] + 2 * door.border + 0.1, depth: 0.13 }
  return (
    <group position={[CABIN.x, 0, CABIN.z]} rotation={[0, CABIN.turn, 0]}>
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.05, foot + 0.01, size[2] - 0.04]} at={[s * (size[0] / 2 - 0.05), foot / 2, 0]} color={colour.concrete} bevel={0.008} />
      ))}
      <Block size={size} at={[0, foot + size[1] / 2, 0]} color={colour.walls} bevel={0.014} />
      <Block size={[size[0] + 0.03, 0.025, size[2] + 0.03]} at={[0, foot + size[1] + 0.01, 0]} color={colour.white} bevel={0.008} />
      <Window size={[0.1, 0.07]} at={[-0.06, foot + 0.12, size[2] / 2]} frame={colour.white} border={0.016} />
      <Block size={[step.width, foot + 0.004, step.depth]} at={[door.x, (foot + 0.004) / 2, size[2] / 2 + step.depth / 2 - 0.01]} color={colour.concrete} bevel={0.006} />
      <Door size={door.size} at={[door.x, foot, size[2] / 2]} color={colour.door} frame={colour.white} step={colour.concrete} border={door.border} />
      <Lit size={[0.03, 0.025, 0.03]} at={[door.x, foot + door.size[1] + door.border + 0.022, size[2] / 2 + 0.02]} color={landmark.lit} />
    </group>
  )
}

/** Its shadow covers the site. */
Construction.shadow = 1.0
/** The heights it follows: the crane's mast takes up the difference. */
Construction.heights = [1.9, 2.5] as const
