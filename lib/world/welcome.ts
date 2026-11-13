import { isGreeting, type GuideSays } from './guide'

/*
 * The welcome pair: on a visitor's first arrival, while the guide's greeting
 * is open, the guide and the visitor's own character pop up large beside it,
 * waving, the visitor's carrying the control that changes it. When it shows
 * and how it comes and goes are decided here, from what the guide says, so
 * every case is a unit test; `components/hud/Welcome.tsx` only draws it.
 */

export interface WelcomeInput {
  /** What the guide says now (`guideSays`), or null when she says nothing. */
  says: GuideSays | null
  /** Her bubble is open, showing the line (not closed, not folded to its chip). */
  open: boolean
}

/** Whether the pair shows: only while her greeting is open. Starting the tour, looking round alone, folding or hiding her hints sends it away. */
export function welcomeShows({ says, open }: WelcomeInput): boolean {
  return open && isGreeting(says)
}

/** Where the pair is: popping in (and then standing), shrinking away, or gone. */
export type WelcomeStage = 'in' | 'out' | 'gone'

/**
 * The pair's next stage, from whether it should show and where it is: it pops
 * in when it should show; when it should not, a pair on screen shrinks away
 * (and is gone once that is done, `WELCOME_TIMING.outMs` later), except under
 * reduced motion, where it simply goes.
 */
export function welcomeStage(shows: boolean, now: WelcomeStage, reducedMotion = false): WelcomeStage {
  if (shows) return 'in'
  if (now === 'gone' || reducedMotion) return 'gone'
  return 'out'
}

/** How the pair comes and goes, in milliseconds: a short pause after the greeting appears, a springy pop, a quicker shrink. The CSS (`.welcome`) reads these. */
export const WELCOME_TIMING = { delayMs: 450, inMs: 650, outMs: 280 } as const

/** How far the visitor's wave runs behind the guide's, in radians of the wave's swing, so the two never wave in unison. */
export const GUEST_WAVE_PHASE = 2.1
