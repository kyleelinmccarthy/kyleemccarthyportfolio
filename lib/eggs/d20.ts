import { Matrix4, Quaternion, Vector3 } from 'three'

/*
 * The twenty-sided die the night sky rolls, as numbers: the roll itself (with
 * the randomness handed in, so a test can choose it), the die's twenty faces
 * and their numbers, which way it turns to show a number, how it tumbles
 * there, where it flies across the screen, and how each face is lit. Pure.
 *
 * The die is drawn in the page's own 3D (CSS transforms), whose axes are x to
 * the right, y down the screen and z out of it toward the visitor: a
 * right-handed frame. Every vector here is in it.
 */

/** A die's sides. */
export const SIDES = 20

/** A number from 1 to 20, every one as likely, from `rand` (a number in [0, 1): `Math.random`, or a test's). Anything outside [0, 1) is held inside it. */
export function rollD20(rand: () => number = Math.random): number {
  const r = rand()
  const k = Number.isFinite(r) ? Math.min(SIDES - 1, Math.max(0, Math.floor(r * SIDES))) : 0
  return k + 1
}

/** A `rand` that rolls `value` (1 to 20) every time: for a forced roll. */
export function riggedTo(value: number): () => number {
  const v = Math.min(SIDES, Math.max(1, Math.round(Number.isFinite(value) ? value : 1)))
  return () => (v - 0.5) / SIDES
}

/** One face of the die: its number, its corners, its middle, the way out of it, and the way its number reads (right, and down from its top corner). */
export interface DieFace {
  value: number
  corners: [Vector3, Vector3, Vector3]
  centre: Vector3
  normal: Vector3
  right: Vector3
  down: Vector3
}

const PHI = (1 + Math.sqrt(5)) / 2

/** The icosahedron's twelve corners, at distance 1 from its middle. */
function corners(): Vector3[] {
  const out: Vector3[] = []
  for (const a of [-1, 1])
    for (const b of [-PHI, PHI]) {
      out.push(new Vector3(0, a, b), new Vector3(a, b, 0), new Vector3(b, 0, a))
    }
  return out.map((v) => v.normalize())
}

let faces: DieFace[] | null = null

/**
 * The die's twenty faces, a die 1 from its middle to each corner. Opposite
 * faces add up to 21, as on a real d20. Each face's number stands upright with
 * its top toward one corner (`down` runs from that corner to the middle of the
 * far edge), and `right`, `down` and `normal` make a right-handed frame, so a
 * face laid out flat on the page and carried by them is never mirrored.
 */
export function d20Faces(): DieFace[] {
  if (faces) return faces
  const c = corners()
  // An edge is the shortest distance between two corners.
  const edge = Math.min(...c.slice(1).map((v) => v.distanceTo(c[0])))
  const found: Array<Omit<DieFace, 'value'>> = []
  for (let i = 0; i < c.length; i++)
    for (let j = i + 1; j < c.length; j++)
      for (let k = j + 1; k < c.length; k++) {
        const near = (a: Vector3, b: Vector3) => Math.abs(a.distanceTo(b) - edge) < 1e-6
        if (!near(c[i], c[j]) || !near(c[j], c[k]) || !near(c[i], c[k])) continue
        const centre = c[i].clone().add(c[j]).add(c[k]).divideScalar(3)
        const normal = centre.clone().normalize()
        // The top corner: the highest on the screen (least y), the first of a tie.
        const trio = [c[i], c[j], c[k]].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z)
        const top = trio[0]
        const down = centre.clone().sub(top).normalize()
        const right = new Vector3().crossVectors(down, normal).normalize()
        found.push({ corners: [top.clone(), trio[1].clone(), trio[2].clone()], centre, normal, right, down })
      }
  // Pair each face with the one opposite; the pairs take 1 and 20, 2 and 19, and so on, in a fixed order.
  const order = found.map((_, i) => i).sort((a, b) => order3(found[a].normal, found[b].normal))
  const value = new Array<number>(found.length).fill(0)
  let next = 1
  for (const i of order) {
    if (value[i]) continue
    const opposite = found.findIndex((f) => f.normal.dot(found[i].normal) < -0.999)
    value[i] = next
    value[opposite] = SIDES + 1 - next
    next++
  }
  faces = found.map((f, i) => ({ ...f, value: value[i] }))
  return faces
}

/** A fixed order for directions: by z, then y, then x, most first. */
function order3(a: Vector3, b: Vector3): number {
  return b.z - a.z || b.y - a.y || b.x - a.x
}

/** The face that shows `value`. */
export function faceOf(value: number): DieFace {
  const all = d20Faces()
  return all.find((f) => f.value === value) ?? all[0]
}

/**
 * The die's turn that shows `value` square to the visitor, its number upright:
 * that face's way out turned toward the visitor (+z), its `down` down the
 * screen and its `right` to the right.
 */
export function showing(value: number): Quaternion {
  const f = faceOf(value)
  // The basis (right, down, normal) carried onto (x, y, z): the inverse of the matrix with them as its columns.
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(f.right, f.down, f.normal)).invert()
}

/** Ease out: fast at first, settling at the end. */
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3)
const clamp01 = (k: number) => Math.min(1, Math.max(0, Number.isFinite(k) ? k : 1))

/**
 * The die's turn `t` of the way (0 to 1) through its tumble: `turns` whole
 * turns about `axis` (a unit vector) before it comes to rest showing `value`,
 * spinning fast at first and slowing as it settles. Exactly `showing(value)`
 * at the end.
 */
export function tumble(t: number, value: number, axis: Vector3, turns: number, out = new Quaternion()): Quaternion {
  const left = 1 - easeOut(clamp01(t))
  return out.setFromAxisAngle(axis, turns * Math.PI * 2 * left).multiply(showing(value))
}

/** A tumble's axis from `rand`: mostly about the line of sight and the upright, as a die rolling across a table is seen side on. */
export function tumbleAxis(rand: () => number): Vector3 {
  const axis = new Vector3(0.35 * (rand() - 0.5), 0.5 + 0.5 * rand(), 0.8 + 0.4 * rand())
  return axis.normalize()
}

/**
 * Where the die is `t` of the way (0 to 1) through its tumble, on a screen
 * `width` by `height`, its middle in pixels: in from off the left edge,
 * slowing to rest at `settle` (shares of the screen across and down), bouncing
 * `bounces` times on the way, each lower than the last, the first `hop` of the
 * screen's height high. At rest at the end.
 */
export function dieFlight(
  t: number,
  view: { width: number; height: number },
  { settle, bounces, hop, size }: { settle: { x: number; y: number }; bounces: number; hop: number; size: number },
): { x: number; y: number } {
  const k = clamp01(t)
  const endX = view.width * settle.x
  const endY = view.height * settle.y
  const startX = -size
  const x = startX + (endX - startX) * easeOut(k)
  const lift = view.height * hop * Math.pow(1 - k, 1.6) * Math.abs(Math.sin(Math.PI * bounces * k))
  return { x, y: endY - lift }
}

/** The light on the die, toward its source: from up, to the left, in front. */
const LIGHT = new Vector3(-0.45, -0.75, 0.55).normalize()

/** The die's three bands of light, as a cel shader's. */
export type Tone = 'lit' | 'mid' | 'shade'

/** How a face whose way out is `normal` (turned as the die is now) is lit: in full, in the half-light, or in shade. */
export function faceTone(normal: Vector3): Tone {
  const k = normal.dot(LIGHT)
  return k > 0.55 ? 'lit' : k > 0.05 ? 'mid' : 'shade'
}
