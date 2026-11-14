/*
 * The eggs' two bursts, as numbers: the confetti a caught bug pops into and
 * the fireworks a natural 20 sets off. Each is laid out once from a `rand`
 * (so the same seed always bursts the same way) and then read at any moment
 * by a formula, nothing stepped frame by frame: where each piece is `t`
 * seconds in, its turn and how faded it is. Everything is in screen pixels,
 * y down. Pure.
 */

/** A point on the screen, in pixels. */
export interface Point {
  x: number
  y: number
}

/** How a burst moves: its pieces' speed out (pixels a second, between the two), the air's drag (a second) and gravity (pixels a second squared). */
export interface Motion {
  speed: readonly [number, number]
  drag: number
  gravity: number
}

/**
 * Where something thrown from `from` at (`vx`, `vy`) is `t` seconds later,
 * slowed by the air (`drag`) and falling (`gravity`): the closed form of
 * dv/dt = g − k·v, so it can be read at any moment without stepping.
 */
export function thrown(from: Point, vx: number, vy: number, t: number, { drag, gravity }: Pick<Motion, 'drag' | 'gravity'>): Point {
  const s = Math.max(0, Number.isFinite(t) ? t : 0)
  const k = Math.max(1e-6, drag)
  const fade = 1 - Math.exp(-k * s)
  return { x: from.x + (vx * fade) / k, y: from.y + (vy * fade) / k + gravity * (s / k - fade / (k * k)) }
}

/** Hermite step from 0 at `a` to 1 at `b`. */
const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/** Between `range`'s two ends, `k` of the way. */
const within = ([a, b]: readonly [number, number], k: number) => a + (b - a) * k

/** One piece of confetti: thrown from where the bug was, turning as it flutters down. */
export interface Piece {
  vx: number
  vy: number
  /** How fast it turns (radians a second), and its turn at the start. */
  spin: number
  turn: number
  color: string
  width: number
  height: number
}

/** The confetti a caught bug pops into, as tuned (`CONFETTI`). */
export interface ConfettiTuning extends Motion {
  pieces: number
  seconds: number
  colors: readonly string[]
  size: readonly [number, number]
}

/** The pieces of one pop: thrown out every way, mostly upward, in the tuning's colours by turns. */
export function confetti(rand: () => number, tuning: ConfettiTuning): Piece[] {
  return Array.from({ length: tuning.pieces }, (_, i) => {
    // Mostly up: the angle runs a little past level either side of straight up.
    const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.1
    const speed = within(tuning.speed, rand())
    const size = within(tuning.size, rand())
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (rand() - 0.5) * 18,
      turn: rand() * Math.PI,
      color: tuning.colors[i % tuning.colors.length],
      width: size,
      height: size * 0.45,
    }
  })
}

/** A piece of confetti `t` seconds after its pop at `from`: where it is, its turn, and how much of it shows (fading out over the last third). */
export function pieceAt(piece: Piece, from: Point, t: number, tuning: ConfettiTuning): Point & { turn: number; alpha: number } {
  const at = thrown(from, piece.vx, piece.vy, t, tuning)
  return { ...at, turn: piece.turn + piece.spin * t, alpha: 1 - smoothstep(tuning.seconds * 0.6, tuning.seconds, t) }
}

/** One firework: it goes up from under the screen's bottom edge at `start` seconds, bursts at `at`, and fades. */
export interface Shell {
  start: number
  from: Point
  at: Point
  color: string
  sparks: Array<{ vx: number; vy: number }>
}

/** The fireworks, as tuned (`FIREWORKS`). */
export interface FireworksTuning extends Motion {
  shells: number
  over: number
  rise: number
  fade: number
  sparks: number
  colors: readonly string[]
  band: { x: readonly [number, number]; y: readonly [number, number] }
}

/** A show over a screen `width` by `height`: the shells going up one after another over `over` seconds, bursting across the band, in the tuning's colours by turns. */
export function fireworks(rand: () => number, view: { width: number; height: number }, tuning: FireworksTuning): Shell[] {
  return Array.from({ length: tuning.shells }, (_, i) => {
    // Spread across the band in turn, jittered, so no two burst on top of each other.
    const lane = (i % 3) / 2
    const x = view.width * within(tuning.band.x, Math.min(1, Math.max(0, lane + (rand() - 0.5) * 0.3)))
    const y = view.height * within(tuning.band.y, rand())
    const turn = rand() * Math.PI * 2
    return {
      start: (i / Math.max(1, tuning.shells - 1)) * tuning.over,
      from: { x: x + (rand() - 0.5) * view.width * 0.08, y: view.height + 10 },
      at: { x, y },
      color: tuning.colors[i % tuning.colors.length],
      sparks: Array.from({ length: tuning.sparks }, (_, k) => {
        const a = turn + (k / tuning.sparks) * Math.PI * 2
        // Some fast, some slow, so a burst is a full ball of light rather than one ring.
        const speed = within(tuning.speed, Math.sqrt(rand()))
        return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
      }),
    }
  })
}

/** A shell `t` seconds into the show: not yet up, rising (its spark), bursting (its sparks, fading), or over. */
export type ShellNow =
  | { phase: 'waiting' | 'over' }
  | { phase: 'rising'; at: Point }
  | { phase: 'burst'; sparks: Point[]; alpha: number; age: number }

/** Where `shell` is `t` seconds into the show. */
export function shellAt(shell: Shell, t: number, tuning: FireworksTuning): ShellNow {
  const s = (Number.isFinite(t) ? t : Infinity) - shell.start
  if (s < 0) return { phase: 'waiting' }
  if (s < tuning.rise) {
    // Slowing as it climbs.
    const k = 1 - Math.pow(1 - s / tuning.rise, 2)
    return { phase: 'rising', at: { x: shell.from.x + (shell.at.x - shell.from.x) * k, y: shell.from.y + (shell.at.y - shell.from.y) * k } }
  }
  const age = s - tuning.rise
  if (age >= tuning.fade) return { phase: 'over' }
  return { phase: 'burst', age, alpha: 1 - smoothstep(tuning.fade * 0.35, tuning.fade, age), sparks: shell.sparks.map((v) => thrown(shell.at, v.vx, v.vy, age, tuning)) }
}

/** How long a show lasts, in seconds: until its last shell's burst has faded. */
export function showLength(tuning: FireworksTuning): number {
  return tuning.over + tuning.rise + tuning.fade
}
