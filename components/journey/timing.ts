/**
 * Camera timing for the scroll journey.
 *
 * Extracted from CinematicJourney so the numbers can be reasoned about — and
 * tested — without pulling framer-motion into a unit test.
 */

/** Scroll distance allotted to each scene, in viewport heights. */
export const VH_PER_SCENE = 200

/** Fraction of a scene's scroll spent dwelling before the camera moves on. */
export const HOLD = 0.48

/**
 * The opening scene gets a shorter dwell than the rest.
 *
 * Every other scene arrives via a camera move, so its dwell is the pause *after*
 * you land — it reads as intentional. Scene one is already on screen before the
 * reader touches the wheel, so the same dwell reads as the page being broken. At
 * the previous 240vh / 0.48 that was 115vh of scrolling — more than a full
 * viewport — before anything moved.
 */
export const FIRST_HOLD = 0.18

/** Dwell fraction for the scene at `index`. */
export function holdFor(index: number): number {
  return index === 0 ? FIRST_HOLD : HOLD
}

/**
 * How long a camera move between rooms takes, measured in units of scroll
 * weight (one unit = the track a weight-1 room owns).
 *
 * This is deliberately a *constant*, not a share of the room you are leaving.
 * When the move was a share, a room heavy enough to page through seven pieces
 * spent more than two viewports' worth of scroll sliding sideways while its
 * pieces were still advancing — so walking the gallery and travelling to the
 * next room happened at the same time and fought each other. Holding the move
 * constant means all the extra weight goes into standing still and looking at
 * the work, which is what the weight was for.
 *
 * 1 - HOLD, so a weight-1 room's timing is exactly what it always was.
 */
export const MOVE_UNITS = 1 - HOLD

/**
 * The end of a room's dwell, as a fraction of total scroll progress.
 *
 * `start`/`span` are this room's slice; `unit` is one weight-unit of the track.
 * The camera sits still from `start` to here, then moves to the next room.
 */
export function dwellEnd(index: number, start: number, span: number, unit: number): number {
  // The opening room keeps its short lead-in: it is on screen before the reader
  // has touched the wheel, so a full dwell there reads as the page being stuck.
  if (index === 0) return start + holdFor(0) * span
  return start + Math.max(span - MOVE_UNITS * unit, HOLD * unit)
}

/**
 * Viewport-heights of scrolling before the camera first moves.
 *
 * Each scene owns `1 / n` of scroll progress and the track is `n * VH_PER_SCENE`
 * tall, so the scene count cancels: the lead-in is the same whether there are
 * five scenes or fifty.
 */
export function leadInVh(): number {
  return FIRST_HOLD * VH_PER_SCENE
}
