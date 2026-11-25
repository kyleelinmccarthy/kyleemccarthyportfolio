'use client'

import { forwardRef } from 'react'
import type { Group } from 'three'
import { dragonColors } from '@/content/eggs'
import { DIE, blend, pointing, type Point2, type Vec3 } from '@/lib/world/kit'
import { Batched, Blob, Block, Die, Extruded, Swept } from '@/components/world/models/kit'

/*
 * The dragon die: the kit's twenty-sided die (as on the Mountain's ledge, in
 * its own colours) with a face, a short curling tail behind in the die's
 * colour, and two bat-like
 * dragon wings, about half a model unit from wing tip to wing tip. Centred on
 * its middle and facing +Z, as the bee does; it flies, so it has no shadow.
 * Each wing is three dark ribs fanning out and back from a hinge on the die's
 * shoulder, with a membrane scalloped between their tips; each is batched
 * apart in its hinge (`wings`), so the flight beats them, and the hinge turns
 * about the body's length (+Z).
 */

/** The die's radius, to its corners. */
const RADIUS = 0.12
/** Where the right wing's hinge is on the die's shoulder; the left mirrors it. */
const HINGE: Vec3 = [0.09, 0.05, 0]
/** The right wing's rib tips, from its hinge, front to back, lying near flat (x out, z along the body). */
const RIBS: Vec3[] = [
  [0.17, 0.004, 0.04],
  [0.2, 0.004, -0.06],
  [0.14, 0.004, -0.13],
]
/** Where the membrane's edge dips in between the rib tips, and where it meets the body behind the hinge. */
const SCALLOPS: Vec3[] = [
  [0.15, 0, -0.02],
  [0.13, 0, -0.09],
]
const WING_ROOT_BACK: Vec3 = [0.02, 0, -0.07]
/** The tail: a curl up and back from under the die's back, and how thick it is along the way. */
const TAIL: Vec3[] = [
  [0, -0.04, -0.08],
  [0, -0.05, -0.15],
  [0, -0.02, -0.21],
  [0, 0.03, -0.23],
  [0, 0.06, -0.2],
]
const TAIL_WIDTHS: Point2[] = [
  [0.034, 0.03],
  [0.026, 0.024],
  [0.018, 0.016],
  [0.011, 0.01],
  [0.005, 0.005],
]

/**
 * A thin square bar from `from` to `to`, `thick` across, with no line: a rib.
 * A `Block` laid between the two points, as the bee's legs are.
 */
function Rib({ from, to, thick, color }: { from: Vec3; to: Vec3; thick: number; color: string }) {
  const { rot, length } = pointing(from, to)
  if (!(length > 0)) return null
  const at: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  return <Block size={[thick, length, thick]} bevel={thick * 0.25} at={at} rot={rot} color={color} outline={false} />
}

/**
 * The membrane's outline as a flat shape in its own plane: the root, then each
 * rib tip with a scallop between, then back along the body. It is drawn in the
 * XY plane and laid flat (its y becomes -z), so a point (x, z) is (x, -z) here;
 * on the left it is mirrored, and run the other way round, so it still faces up.
 */
function membrane(side: 1 | -1): Point2[] {
  const edge: Vec3[] = [[0, 0, 0], RIBS[0], SCALLOPS[0], RIBS[1], SCALLOPS[1], RIBS[2], WING_ROOT_BACK]
  const shape = edge.map(([x, , z]) => [x * side, -z] as Point2)
  return side === 1 ? shape : shape.reverse()
}

/** A wing in its hinge on the right (`side` 1) or the left (-1): its ribs and its membrane, batched. */
const Wing = forwardRef<Group, { side: 1 | -1; skin: string; ribs: string }>(function Wing({ side, skin, ribs }, ref) {
  return (
    <group ref={ref} position={[side * HINGE[0], HINGE[1], HINGE[2]]}>
      <Batched>
        <Extruded shape={membrane(side)} depth={0.006} bevel={0.002} rot={[-Math.PI / 2, 0, 0]} color={skin} outline={false} />
        {RIBS.map((tip, i) => (
          <Rib key={i} from={[0, 0.004, 0]} to={[tip[0] * side, tip[1], tip[2]]} thick={0.012} color={ribs} />
        ))}
      </Batched>
    </group>
  )
})

/** The dragon die, wings held flat. `wings` takes the right and left wings' hinges, for the flight to beat. */
export function DragonDie({ wings }: { wings: [React.Ref<Group>, React.Ref<Group>] }) {
  const die = blend(dragonColors.die.from, dragonColors.die.toward, dragonColors.die.k)
  const skin = blend(dragonColors.membrane.from, dragonColors.membrane.toward, dragonColors.membrane.k)
  return (
    <group name="dragon-die">
      <Batched>
        {/* The kit's die stands on a face; lowered by its inradius, so its middle is the origin. */}
        <Die radius={RADIUS} at={[0, -DIE.inradius * RADIUS, 0]} color={die} />
        {/* Its eyes, on the die's front, and its tail behind. */}
        <Blob radius={0.018} at={[0.04, 0.04, 0.095]} color={dragonColors.eyes} outline={false} />
        <Blob radius={0.018} at={[-0.04, 0.04, 0.095]} color={dragonColors.eyes} outline={false} />
        <Swept path={TAIL} widths={TAIL_WIDTHS} sides={6} color={die} />
      </Batched>
      <Wing ref={wings[0]} side={1} skin={skin} ribs={dragonColors.ribs} />
      <Wing ref={wings[1]} side={-1} skin={skin} ribs={dragonColors.ribs} />
    </group>
  )
}
