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
 * Viewport-heights of scrolling before the camera first moves.
 *
 * Each scene owns `1 / n` of scroll progress and the track is `n * VH_PER_SCENE`
 * tall, so the scene count cancels: the lead-in is the same whether there are
 * five scenes or fifty.
 */
export function leadInVh(): number {
  return FIRST_HOLD * VH_PER_SCENE
}
