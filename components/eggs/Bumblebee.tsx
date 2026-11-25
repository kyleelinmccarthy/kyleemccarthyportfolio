'use client'

import { forwardRef } from 'react'
import type { Group } from 'three'
import { bugColors } from '@/content/eggs'
import { blend, ellipseOutline, pointing, type Vec3 } from '@/lib/world/kit'
import { Batched, Blob, Block, ContactShadow, Extruded, Tufted } from '@/components/world/models/kit'

/*
 * The bug: a round, fuzzy bumblebee from the kit's parts, about a third of a
 * model unit long (a cat at Home is a little shorter), standing on y = 0 and
 * facing +Z, as a landmark does. A fluffy gold thorax, a dark round head with
 * two pale eyes and two short feelers, a plump dark abdomen with a gold band
 * round its middle, tipped a little down behind, six short dark legs under it,
 * and two pale wings on its back. Its soft shadow stays on the ground;
 * everything else is in `body`, which the flight lifts off it, and each wing is
 * batched apart in its own hinge (`wings`), so the flight beats them.
 */

/** Where the body's middle is, above the ground, when it has landed. */
const RIDE = 0.1
/** How far forward the whole bee sits, so it is centred on its spot (its abdomen reaches further back than its head does forward). */
const FORWARD = 0.02

/**
 * The abdomen: an ellipsoid's middle and half-sizes (across, up, along), and how
 * far its back end dips (radians). Its gold band is a second, shorter and a
 * little fatter ellipsoid about the same middle, so the gold shows only where
 * it stands proud: a stripe round the middle, with dark before and behind it.
 */
const ABDOMEN = { at: [0, RIDE - 0.005, -0.075] as Vec3, radii: [0.068, 0.062, 0.088] as Vec3, band: [0.074, 0.068, 0.05] as Vec3, dip: 0.16 }

/** Where each leg leaves the body and where its foot stands: front, middle and back, on the right (+x); the left mirror them. */
const LEGS: Array<{ hip: Vec3; foot: Vec3 }> = [
  { hip: [0.03, RIDE - 0.04, 0.05], foot: [0.06, 0, 0.08] },
  { hip: [0.035, RIDE - 0.045, 0.01], foot: [0.075, 0, 0.005] },
  { hip: [0.03, RIDE - 0.045, -0.03], foot: [0.065, 0, -0.07] },
]

/** Where the wings hinge on the thorax's top, either side of its middle; each lies back and out from there. */
const WING_HINGE: Vec3 = [0.022, RIDE + 0.05, 0.01]
/** A wing's half-sizes across and along, and how far it turns out from the body's line (radians). */
const WING = { half: [0.036, 0.075] as [number, number], splay: 0.42 }

/**
 * A thin square bar from `from` to `to`, `thick` across, with no line: a leg or
 * a feeler. A `Block` laid between the two points, so it costs a box's few
 * triangles where a round rod costs four times as many, and at a bug's size
 * the two look the same.
 */
function Limb({ from, to, thick, color }: { from: Vec3; to: Vec3; thick: number; color: string }) {
  const { rot, length } = pointing(from, to)
  const [fx, fy, fz] = from
  const [tx, ty, tz] = to
  if (!(length > 0)) return null
  return <Block size={[thick, length, thick]} bevel={thick * 0.25} at={[(fx + tx) / 2, (fy + ty) / 2, (fz + tz) / 2]} rot={rot} color={color} outline={false} />
}

/**
 * A wing, in its hinge on the right (`side` 1) or the left (-1): a pale, flat
 * oval plate lying back and out over the abdomen, its root at the hinge. It
 * has no line, so each wing is a single draw.
 */
const Wing = forwardRef<Group, { side: 1 | -1; color: string }>(function Wing({ side, color }, ref) {
  const [w, l] = WING.half
  return (
    <group ref={ref} position={[side * WING_HINGE[0], WING_HINGE[1], WING_HINGE[2]]}>
      <Batched>
        <group rotation={[0, side * WING.splay, 0]}>
          <Extruded shape={ellipseOutline(w, l, 12)} depth={0.006} bevel={0.002} at={[0, 0.004, -l * 0.85]} rot={[-Math.PI / 2, 0, 0]} color={color} outline={false} />
        </group>
      </Batched>
    </group>
  )
})

/**
 * The bumblebee, landed. `body` takes the group the flight lifts (everything
 * but its shadow); `wings` the right and left wings' hinges, for the flight to
 * beat (they turn about the body's length, +Z).
 */
export function Bumblebee({ body, wings }: { body: React.Ref<Group>; wings: [React.Ref<Group>, React.Ref<Group>] }) {
  const wing = blend(bugColors.wings.from, bugColors.wings.toward, bugColors.wings.k)
  return (
    <group name="bumblebee">
      <ContactShadow radius={0.14} />
      <group ref={body}>
        <group position={[0, 0, FORWARD]}>
          <Batched>
            {/* The fluffy thorax, and the abdomen behind it with its gold band, its back end dipping. */}
            <Tufted radius={0.06} squash={[1, 0.95, 0.95]} tufts={6} depth={0.25} at={[0, RIDE + 0.004, 0.025]} color={bugColors.fur} />
            <group position={ABDOMEN.at} rotation={[-ABDOMEN.dip, 0, 0]}>
              <Blob radius={1} squash={ABDOMEN.radii} color={bugColors.bands} />
              <Blob radius={1} squash={ABDOMEN.band} color={bugColors.fur} />
            </group>
            {/* The head, its eyes and its feelers. */}
            <Blob radius={1} squash={[0.042, 0.038, 0.036]} at={[0, RIDE - 0.008, 0.088]} color={bugColors.head} />
            <Blob radius={0.012} at={[0.024, RIDE + 0.002, 0.112]} color={bugColors.eyes} outline={false} />
            <Blob radius={0.012} at={[-0.024, RIDE + 0.002, 0.112]} color={bugColors.eyes} outline={false} />
            <Limb from={[0.012, RIDE + 0.026, 0.108]} to={[0.036, RIDE + 0.06, 0.142]} thick={0.008} color={bugColors.legs} />
            <Limb from={[-0.012, RIDE + 0.026, 0.108]} to={[-0.036, RIDE + 0.06, 0.142]} thick={0.008} color={bugColors.legs} />
            {/* Its six short legs, under it. */}
            {[1, -1].flatMap((side) =>
              LEGS.map((leg, i) => <Limb key={`${side}${i}`} from={[leg.hip[0] * side, leg.hip[1], leg.hip[2]]} to={[leg.foot[0] * side, leg.foot[1], leg.foot[2]]} thick={0.011} color={bugColors.legs} />),
            )}
          </Batched>
          <Wing ref={wings[0]} side={1} color={wing} />
          <Wing ref={wings[1]} side={-1} color={wing} />
        </group>
      </group>
    </group>
  )
}
