import type { Figure } from './figure'
import type { Point2, Vec3 } from './kit'

/*
 * Long wavy hair, as locks: where each lock of a head of long, loose waves
 * runs, in the head's own frame (its middle at the origin, the face toward
 * +Z), from the figure's proportions. Pure, so the builder
 * (`components/world/models/Character.tsx`) only draws them, each as a kit
 * `Swept`, and their shape is tested (tests/unit/world/hair.test.ts).
 *
 * The hair is a crown over the skull and, from under it, locks that fall
 * past the shoulders to the elbows: two from the parting down the sides of
 * the face and in front of the shoulders, the rest round the sides and the
 * back. Every lock swings from side to side as it falls, more toward its end,
 * each out of step with its neighbours, so the hair's edge runs in waves and
 * no two locks lie alike; and each ends in a point.
 */

/** One lock: a `Swept`'s path, widths and facing, and whether it is a lighter streak. */
export interface Lock {
  path: Vec3[]
  widths: Point2[]
  facing: Vec3
  streak: boolean
  /** A thin streak lying on another lock draws no line of its own. */
  outline: boolean
}

/** The crown: its size as shares of the head's [width, height, depth], and its middle as shares of the head's height and depth. */
export const CROWN = { size: [1.22, 1.06, 1.08] as Vec3, up: 0.13, back: 0.1, round: 0.85 } as const

/**
 * The waves: how many each lock makes from its root to its end, how far it
 * swings round the head at its end (radians), and how far in and out (a share
 * of its distance from the neck); and how far each lock's wave is ahead of
 * its neighbour's, in radians for each radian round the head, so the waves
 * run round the hair and neighbours lie alongside, never across, each other.
 */
export const WAVES = { count: 2.1, swing: 0.3, swell: 0.13, step: 2.3 } as const

/** How many points lay a lock's path: enough for each wave to turn smoothly. */
const POINTS = 12

/** A lock's breadth at `t` of its length, as a share of its fullest: slim at the root, full through the middle, to a point. */
const taper = (t: number) => (t < 0.15 ? 0.55 + 0.45 * (t / 0.15) : t > 0.5 ? Math.max(0, 1 - ((t - 0.5) / 0.5) ** 1.7) : 1)

const TAU = Math.PI * 2
const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/** A lock hanging at `azimuth` round the head (0 is the front, positive toward +X; the back is π). */
interface Fall {
  azimuth: number
  /** Its length against the hair's, and its breadth against a lock's. */
  long?: number
  wide?: number
  streak?: boolean
}

/**
 * The locks round the sides and the back, her left side (+X) the fuller, as
 * in her portrait.
 */
const FALLS: Fall[] = [
  { azimuth: -1.2, long: 0.9 },
  { azimuth: -1.65, long: 0.97 },
  { azimuth: -2.1, long: 1.02 },
  { azimuth: -2.55 },
  { azimuth: -2.95, long: 1.04 },
  { azimuth: 2.95, long: 1.02 },
  { azimuth: 2.55 },
  { azimuth: 2.1, long: 1.03, wide: 1.1 },
  { azimuth: 1.65, long: 0.98, wide: 1.1 },
  { azimuth: 1.2, long: 0.92, wide: 1.1 },
]

/**
 * The two locks from the parting (a little to her left of the top of her
 * head) down each side of her face and on in front of the shoulder, as points
 * [across, up, forward] in shares of the head's height. Below the chin
 * `longWaves` lays them in front of the shoulders.
 */
const PARTING: Vec3 = [0.07, 0.5, 0.24]
const FRAME: Record<'right' | 'left', Vec3[]> = {
  // Her right (the viewer's left): the long sweep across the brow.
  right: [PARTING, [-0.15, 0.46, 0.3], [-0.31, 0.29, 0.31], [-0.4, 0.04, 0.29]],
  // Her left: the short fall from the parting.
  left: [PARTING, [0.24, 0.43, 0.27], [0.37, 0.26, 0.29], [0.43, 0.03, 0.28]],
}

/** How far the hair reaches, in the head's frame: the shoulders' height, its end at the elbows, and how far out it must stand to clear the shoulder (at the sides) and the chest (in front and behind). */
function reach(f: Figure) {
  const hh = f.head.size[1]
  const shoulders = f.shoulder.y - f.head.at[1]
  return { shoulders, end: shoulders - f.arm.upper * 0.95, clear: { side: f.shoulder.x + f.arm.shoulder * 1.2 + hh * 0.1, depth: f.chest.size[2] / 2 + hh * 0.1 } }
}

/**
 * The locks of a head of long wavy hair, for a figure, in its head's frame.
 * They reach to the elbows, stand clear of the shoulders, and leave the face
 * open between the two that frame it.
 */
export function longWaves(f: Figure): Lock[] {
  const [hw, hh, hd] = f.head.size
  const { shoulders, end, clear } = reach(f)
  const top = hh * 0.22
  const lock = { wide: hh * 0.3, thick: hh * 0.18 }

  const fall = ({ azimuth, long = 1, wide = 1, streak = false }: Fall): Lock => {
    const ts = Array.from({ length: POINTS }, (_, i) => i / (POINTS - 1))
    const path = ts.map((t): Vec3 => {
      const y = top + (end * long - top) * t
      // Out from the skull to clear the shoulders by the time it reaches them.
      const out = smooth((top - y) / (top - shoulders))
      const turn = TAU * WAVES.count * t + azimuth * WAVES.step
      // The waves begin below the crown and loosen toward the ends.
      const loose = smooth(t * 3) * (0.55 + 0.45 * t)
      const a = azimuth + WAVES.swing * loose * Math.sin(turn)
      const swell = 1 + WAVES.swell * loose * Math.cos(turn)
      const rx = (hw * 0.52 + (clear.side - hw * 0.52) * out) * swell
      const rz = (hd * 0.5 + (Math.max(clear.depth, hd * 0.44) - hd * 0.5) * out) * swell
      return [Math.sin(a) * rx, y, Math.cos(a) * rz]
    })
    return { path, widths: ts.map((t): Point2 => [lock.wide * wide * taper(t), lock.thick * Math.min(1, taper(t) * 1.3)]), facing: [Math.sin(azimuth), 0, Math.cos(azimuth)], streak, outline: true }
  }

  // A framing lock: from the parting down the side of the face, then in front of the shoulder in waves to the hair's end.
  const frame = (side: -1 | 1, phase: number, streak: boolean, slim = 1, lift = 0): Lock => {
    const face = FRAME[side < 0 ? 'right' : 'left'].map(([x, y, z]): Vec3 => [x * hh + side * lift, y * hh, z * hh + lift])
    const from = face[face.length - 1]
    const steps = 8
    const below = Array.from({ length: steps }, (_, k): Vec3 => {
      const t = (k + 1) / steps
      const y = from[1] + (end * 0.98 - from[1]) * t
      const turn = TAU * 1.5 * t + phase
      // Beside the neck, then out over the front of the shoulder, swinging as it falls.
      const x = side * (hh * 0.42 + hh * 0.04 * t + hh * 0.1 * (0.5 + 0.5 * t) * Math.sin(turn))
      const z = Math.max(from[2], f.chest.size[2] / 2 + hh * 0.07) + hh * 0.04 * Math.cos(turn) + lift
      return [x, y, z]
    })
    const path = [...face, ...below]
    const widths = path.map((_, i): Point2 => {
      const k = taper(i / (path.length - 1))
      return [lock.wide * slim * k, lock.thick * (slim < 1 ? 0.6 : 1) * Math.min(1, k * 1.3)]
    })
    return { path, widths, facing: [side * 0.45, 0.1, 1], streak, outline: slim >= 1 }
  }

  return [
    ...FALLS.map(fall),
    // The blonde: a broad streak down the lock on the right of her face, and a slim one through the lengths on her left.
    frame(-1, 0.6, false),
    frame(-1, 0.6, true, 0.62, hh * 0.04),
    frame(1, 3.4, false),
    frame(1, 3.4, true, 0.3, hh * 0.04),
  ]
}
