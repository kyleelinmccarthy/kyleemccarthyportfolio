'use client'

import { forwardRef, useMemo } from 'react'
import { Euler, Quaternion, Vector3, type Group } from 'three'
import { bugColors } from '@/content/eggs'
import { blend, pointing, type Vec3 } from '@/lib/world/kit'
import { Batched, Blob, Block, ContactShadow, Swept } from '@/components/world/models/kit'

/*
 * The bug: a seven-spot ladybug from the kit's parts, about a quarter of a
 * model unit long (a cat at Home is a little shorter), standing on y = 0 and
 * facing +Z, as a landmark does. A domed red shell parted down its back, a
 * dark shield and head before it with two pale eyes and two short feelers,
 * seven dark spots (one on the shield's edge, three on each wing case), and
 * six legs in two sets of three that step by turns (`legs`). The body is
 * batched; each set of legs is batched apart, so the walk moves two meshes.
 */

/** The shell: an ellipsoid's middle and its half-sizes across, up and along, in model units. */
const SHELL = { at: [0, 0.072, -0.012] as Vec3, radii: [0.1, 0.06, 0.118] as Vec3 }

/** A point on the shell's top at (x, z) across the ground, and the way out of the shell there. */
function onShell(x: number, z: number, sink: number): { at: Vec3; rot: Vec3 } {
  const [cx, cy, cz] = SHELL.at
  const [rx, ry, rz] = SHELL.radii
  const k = Math.max(0, 1 - (x / rx) ** 2 - ((z - cz) / rz) ** 2)
  const y = cy + ry * Math.sqrt(k)
  const normal = new Vector3(x / rx ** 2, (y - cy) / ry ** 2, (z - cz) / rz ** 2).normalize()
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal))
  return { at: [x - normal.x * sink, y - normal.y * sink, z - normal.z * sink], rot: [turn.x, turn.y, turn.z] }
}

/** The seven spots, on the shell from above (x, z): one at the shield's edge, three on each wing case. */
const SPOTS: Array<[number, number, number]> = [
  // [x, z, radius]
  [0, 0.078, 0.024],
  [0.05, 0.03, 0.021],
  [-0.05, 0.03, 0.021],
  [0.062, -0.04, 0.019],
  [-0.062, -0.04, 0.019],
  [0.034, -0.085, 0.017],
  [-0.034, -0.085, 0.017],
]

/** The seam down its back, where the wing cases meet: points just proud of the shell's top, front to back. */
function seam(): Vec3[] {
  const [, cy, cz] = SHELL.at
  const [, ry, rz] = SHELL.radii
  return [-0.55, -0.1, 0.45, 0.95, 1.35].map((a) => [0, cy + ry * 1.02 * Math.cos(a), cz - rz * 1.02 * Math.sin(a)] as Vec3)
}

/** Where each leg leaves the body and where its foot stands: front, middle and back, on the right (+x); the left mirror them. */
const LEGS: Array<{ hip: Vec3; foot: Vec3 }> = [
  { hip: [0.045, 0.03, 0.05], foot: [0.115, 0, 0.11] },
  { hip: [0.055, 0.03, -0.005], foot: [0.135, 0, -0.01] },
  { hip: [0.045, 0.03, -0.06], foot: [0.12, 0, -0.13] },
]

/** One set of three legs: the front and back on one side and the middle on the other. */
function legSet(side: 1 | -1): Array<{ hip: Vec3; foot: Vec3 }> {
  return LEGS.map((leg, i) => {
    const s = i === 1 ? -side : side
    return { hip: [leg.hip[0] * s, leg.hip[1], leg.hip[2]], foot: [leg.foot[0] * s, leg.foot[1], leg.foot[2]] }
  })
}

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

/** A set of legs, as a batched group the walk moves. */
const LegSet = forwardRef<Group, { side: 1 | -1; color: string }>(function LegSet({ side, color }, ref) {
  return (
    <group ref={ref}>
      <Batched>
        {legSet(side).map((leg, i) => (
          <Limb key={i} from={leg.hip} to={leg.foot} thick={0.013} color={color} />
        ))}
      </Batched>
    </group>
  )
})

/**
 * The ladybug, standing still. `legs` takes the two sets of legs' groups, for
 * the walk to step (the first set the right front, left middle and right back
 * legs; the second the others).
 */
export function Ladybug({ legs }: { legs: [React.Ref<Group>, React.Ref<Group>] }) {
  const shell = blend(bugColors.shell.from, bugColors.shell.toward, bugColors.shell.k)
  const spots = useMemo(() => SPOTS.map(([x, z, r]) => ({ ...onShell(x, z, r * 0.3), r })), [])
  const path = useMemo(seam, [])
  return (
    <group name="ladybug">
      <ContactShadow radius={0.15} />
      <Batched>
        {/* The shell, the seam down its back, and the spots, set into its surface. */}
        <Blob radius={1} squash={SHELL.radii} at={SHELL.at} color={shell} />
        <Swept path={path} widths={path.map(() => [0.01, 0.006] as [number, number])} sides={4} color={bugColors.spots} outline={false} />
        {spots.map((s, i) => (
          <Blob key={i} radius={s.r} squash={[1, 0.4, 1]} at={s.at} rot={s.rot} color={bugColors.spots} outline={false} />
        ))}
        {/* The shield before the shell, and the head. */}
        <Blob radius={1} squash={[0.062, 0.042, 0.04]} at={[0, 0.07, 0.092]} color={bugColors.head} />
        <Blob radius={0.036} squash={[1.15, 0.85, 1]} at={[0, 0.058, 0.132]} color={bugColors.head} />
        {/* Its eyes, and its feelers. */}
        <Blob radius={0.011} at={[0.021, 0.068, 0.158]} color={bugColors.eyes} outline={false} />
        <Blob radius={0.011} at={[-0.021, 0.068, 0.158]} color={bugColors.eyes} outline={false} />
        <Limb from={[0.014, 0.08, 0.152]} to={[0.042, 0.114, 0.192]} thick={0.008} color={bugColors.legs} />
        <Limb from={[-0.014, 0.08, 0.152]} to={[-0.042, 0.114, 0.192]} thick={0.008} color={bugColors.legs} />
      </Batched>
      <LegSet ref={legs[0]} side={1} color={bugColors.legs} />
      <LegSet ref={legs[1]} side={-1} color={bugColors.legs} />
    </group>
  )
}
