import type { DistrictId, Place } from '@/content/types'

/*
 * The arrival: on the first load of the home page in a visit, the headline
 * lands in large type with the proof figures counting up under it, then
 * settles into the header while the planet spins in, the landmarks pop up
 * district by district, and last the guide greets the visitor (the welcome
 * pair). About four seconds. It plays once per visit, can be skipped, and
 * never plays under reduced motion, nor on a deep link.
 *
 * Every stage and its time is data here, on one clock: milliseconds since
 * the page's init script started it (`arrivalInitScript`). The HUD reads the
 * times as CSS custom properties (`arrivalCssVars`, set on <html> by that
 * script), so its part runs in CSS even before the page's JavaScript
 * arrives; the canvas reads the same clock every frame (`planetScale`,
 * `planetTurn`, `riseAt`); the guide waits for its stage (`stageAt`).
 */

/** sessionStorage: '1' once the arrival has played this visit. The e2e specs set it to start as a visitor who has seen it. */
export const ARRIVAL_SEEN_KEY = 'kym-arrival-seen'
/** Set on <html> to 'play' by the init script while the arrival plays; removed when it ends or is skipped. */
export const ARRIVAL_ATTR = 'data-arrival'
/** Set on <html> by the init script: when the arrival began, in `performance.now()` milliseconds. */
export const ARRIVAL_AT_ATTR = 'data-arrival-at'

/** A stretch of the arrival: when it starts and how long it runs, in milliseconds from the start. */
export interface Span {
  at: number
  ms: number
}

/** The arrival's timeline, in milliseconds from its start. */
export const ARRIVAL = {
  /** The headline lands, large, in the middle of the sky. */
  line: { at: 0, ms: 650 },
  /** The proof figures come in under it... */
  figures: { at: 400, ms: 450 },
  /** ...and count up from nothing to their values. */
  count: { at: 550, ms: 1150 },
  /** The headline and figures settle into the header, where they stay. */
  settle: { at: 1900, ms: 650 },
  /** The planet spins in, from small, turning, with a little overshoot. */
  planet: { at: 1800, ms: 1100 },
  /** The landmarks rise, district by district in tour order, a district's places one after another. */
  landmarks: { at: 2350, ms: 500, districtStep: 170, placeStep: 50 },
  /** The legend, the map's labels and the hint come in. */
  hud: { at: 3300, ms: 400 },
  /** The guide's greeting (and with it the welcome pair, which pops up on its own timing, `WELCOME_TIMING`). */
  greet: 3500,
  /** All of it done: the world at rest, the page as it always is. */
  end: 3900,
} as const

/** The planet's size as it starts to spin in, as a fraction of its own. */
const PLANET_FROM = 0.4
/** How far (radians) the planet turns as it spins in, ending where the visitor's view begins. */
const PLANET_TURN = 1.7
/** The overshoot of the planet's arrival and of each landmark's rise (`easeOutBack`'s constant): a landmark's is springier. */
const OVERSHOOT = { planet: 1.1, landmark: 2.2 }

/** Where the arrival is: the statement alone, the world building, the guide greeting, or done. */
export type ArrivalStage = 'statement' | 'build' | 'greet' | 'done'

/** The stage at `ms` into the arrival. Anything not a number counts as done. */
export function stageAt(ms: number): ArrivalStage {
  if (!(ms < ARRIVAL.end)) return 'done'
  if (ms >= ARRIVAL.greet) return 'greet'
  if (ms >= ARRIVAL.settle.at) return 'build'
  return 'statement'
}

/** When (ms) the stage after the one at `ms` begins, or null once done. */
export function nextStageAt(ms: number): number | null {
  if (!(ms < ARRIVAL.end)) return null
  if (ms >= ARRIVAL.greet) return ARRIVAL.end
  if (ms >= ARRIVAL.settle.at) return ARRIVAL.greet
  return ARRIVAL.settle.at
}

/** How far through `span` the arrival is at `ms`: 0 before it, 1 after it. */
export function progress(span: Span, ms: number): number {
  if (!(ms > span.at)) return 0
  return span.ms > 0 ? Math.min(1, (ms - span.at) / span.ms) : 1
}

/** Eases out: quick, then gentle. */
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/** Eases out past the end and back (`s` sets how far past). 0 at 0, 1 at 1. */
export function easeOutBack(t: number, s: number): number {
  const u = t - 1
  return 1 + (s + 1) * u ** 3 + s * u ** 2
}

/** The planet's scale at `ms`: 0 (not drawn) before it spins in, 1 after. */
export function planetScale(ms: number): number {
  const t = progress(ARRIVAL.planet, ms)
  if (t === 0) return 0
  return PLANET_FROM + (1 - PLANET_FROM) * easeOutBack(t, OVERSHOOT.planet)
}

/** The planet's turn (radians about its axis) at `ms`: from `-PLANET_TURN` to 0. */
export function planetTurn(ms: number): number {
  return -PLANET_TURN * (1 - easeOutCubic(progress(ARRIVAL.planet, ms)))
}

/**
 * When each place's landmark starts to rise (ms), by place id: the districts
 * in `districtOrder`, `districtStep` apart; within a district, its places in
 * the order they are listed, `placeStep` apart.
 */
export function landmarkDelays(places: readonly Place[], districtOrder: readonly DistrictId[]): Map<string, number> {
  const { at, districtStep, placeStep } = ARRIVAL.landmarks
  const delays = new Map<string, number>()
  districtOrder.forEach((district, d) => {
    places.filter((p) => p.district === district).forEach((p, i) => delays.set(p.id, at + d * districtStep + i * placeStep))
  })
  return delays
}

/** A landmark's scale at `ms`, rising from the ground from `delay`: 0 (not drawn) before, past 1 a moment, then 1. */
export function riseAt(ms: number, delay: number): number {
  const t = progress({ at: delay, ms: ARRIVAL.landmarks.ms }, ms)
  return t === 0 ? 0 : easeOutBack(t, OVERSHOOT.landmark)
}

/**
 * A proof figure's value split for counting: the number that counts up (the
 * first whole number in it), and the text before and after it, which stays.
 * A value with no number in it does not count (`to` is null).
 */
export function countParts(value: string): { before: string; to: number | null; after: string } {
  const match = /\d+/.exec(value)
  if (!match) return { before: value, to: null, after: '' }
  return { before: value.slice(0, match.index), to: Number(match[0]), after: value.slice(match.index + match[0].length) }
}

/** The timeline as CSS custom properties, which the HUD's part of the arrival reads (globals.css, `.arrival`). */
export function arrivalCssVars(): Record<string, string> {
  const ms = (n: number) => `${n}ms`
  return {
    '--arrival-line-at': ms(ARRIVAL.line.at),
    '--arrival-line-ms': ms(ARRIVAL.line.ms),
    '--arrival-figures-at': ms(ARRIVAL.figures.at),
    '--arrival-figures-ms': ms(ARRIVAL.figures.ms),
    '--arrival-count-at': ms(ARRIVAL.count.at),
    '--arrival-count-ms': ms(ARRIVAL.count.ms),
    '--arrival-settle-at': ms(ARRIVAL.settle.at),
    '--arrival-settle-ms': ms(ARRIVAL.settle.ms),
    '--arrival-planet-at': ms(ARRIVAL.planet.at),
    '--arrival-planet-ms': ms(ARRIVAL.planet.ms),
    '--arrival-hud-at': ms(ARRIVAL.hud.at),
    '--arrival-hud-ms': ms(ARRIVAL.hud.ms),
  }
}

/**
 * Inline script that runs before first paint: if the arrival should play
 * (on the home page itself, with no district or index asked for in the URL,
 * not yet seen this visit, and with motion welcome), it remembers for the
 * visit that it has, marks <html> with
 * `data-arrival="play"` and the moment it began, and sets the timeline's CSS
 * custom properties there, so the page's first frame is already the
 * arrival's (never the still page and then the arrival). It cannot import
 * anything, so the key, the attributes and the times are written into it.
 * Blocked storage means no arrival: it could not be kept to once a visit.
 */
export function arrivalInitScript(): string {
  return (
    `(function(){try{var l=location;` +
    `if(l.pathname!=='/'||l.search||l.hash)return;` +
    `if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;` +
    `var s=sessionStorage;if(s.getItem('${ARRIVAL_SEEN_KEY}')==='1')return;s.setItem('${ARRIVAL_SEEN_KEY}','1');` +
    `var e=document.documentElement,v=${JSON.stringify(arrivalCssVars())};` +
    `for(var k in v)e.style.setProperty(k,v[k]);` +
    `e.setAttribute('${ARRIVAL_AT_ATTR}',String(performance.now()));e.setAttribute('${ARRIVAL_ATTR}','play')` +
    `}catch(x){}})();`
  )
}
