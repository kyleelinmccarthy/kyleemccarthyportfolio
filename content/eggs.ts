import { landmark } from './sky'

/*
 * The two easter eggs, as data: what they say and how they are tuned.
 *
 * By day a ladybug wanders the planet; pressing it squashes it into confetti
 * with the line below and a count kept on the device. By night the
 * constellation "The Natural 20" can be pressed (or `roll` typed anywhere, at
 * any hour) to roll a twenty-sided die across the screen; a 20 sets off
 * fireworks over the planet.
 *
 * Words marked DRAFT are drafted for the owner's review.
 */

/** The constellation that rolls the die when pressed (its name in `constellations`, `content/sky.ts`). */
export const ROLL_CONSTELLATION = 'The Natural 20'

/** What the eggs say. */
export const eggWords = {
  /** Said when the bug is caught. */
  feature: 'It’s a feature, not a bug.',
  /** The count of bugs caught on this device, under it. */
  squashed: (n: number) => `Bugs squashed: ${n}`,
  /** The word that rolls the die, typed anywhere outside a field. */
  rollWord: 'roll',
  /** The result of a roll. */
  rolled: (n: number) => `You rolled ${n}.`,
  /** DRAFT: a natural 20, under the result, with the fireworks. */
  natural20: 'Natural 20. Critical success!',
  /** DRAFT: a natural 1, under the result: a small, gentle joke. */
  natural1: 'A natural 1. It happens to the best of us.',
} as const

/**
 * The bug: a small ladybug. Sizes are in model units (a landmark's, `MODEL_SCALE`
 * world units each); angles over the planet in degrees of arc.
 */
export const BUG = {
  /** How far it walks a second while walking, in degrees of arc: about a landmark's footprint in five seconds. */
  speed: 1.1,
  /** It walks this many seconds, then stops this many, as a beetle does, then sets off again. */
  walk: 5.5,
  pause: 1.4,
  /** Each step of its path, in degrees of arc. */
  step: 0.25,
  /** The steps in one leg of its walk; the next leg starts where the last ended. */
  legSteps: 480,
  /** How far it may turn from one step to the next on its own (radians), and how far it turns at a time to find a way round something. */
  wiggle: 0.22,
  turnStep: 0.35,
  /** How far it keeps from every landmark's footprint and every tree or building, in model units. */
  clearance: 0.5,
  /** Never this close to where the last one was caught, in degrees, so a new one is somewhere else. */
  hop: 25,
  /** It stands this many times its size when the camera is far out over the planet (so it can be seen), and its own size close to. */
  farScale: 1.7,
  /** The camera's distance from the planet's centre over which it grows from its own size to `farScale`. */
  scaleFrom: 1.6,
  scaleTo: 4.6,
  /** The invisible shape that takes a press: a ball this round about its body, a generous target for a small thing. */
  hit: 0.42,
  /** How long until another bug appears once one is caught, in seconds. */
  respawn: 30,
  /** Its legs sweep this far either way (radians) as it walks, this many times for each degree it covers. */
  stride: 0.38,
  strides: 9,
} as const

/** The ladybug's colours, from the landmark palette. */
export const bugColors = {
  /** Its shell: the palette's deep red, softened toward coral, never a flat primary. */
  shell: { from: landmark.red, toward: landmark.coral, k: 0.3 },
  spots: landmark.indigo,
  head: landmark.indigo,
  legs: landmark.indigo,
  eyes: landmark.offWhite,
} as const

/** The confetti a caught bug pops into: from the palette, and short-lived. */
export const CONFETTI = {
  pieces: 60,
  seconds: 1.4,
  colors: [landmark.gold, landmark.pink, landmark.teal, landmark.sky, landmark.coral, landmark.purple],
  /** Pixels a second, outward and upward at the start; pixels a second squared, downward. */
  speed: [220, 540],
  gravity: 900,
  /** How quickly the air slows it (a second). */
  drag: 2.6,
  /** A piece's size, in pixels. */
  size: [6, 11],
} as const

/** How long the bug's words stay up, in milliseconds. */
export const SQUASH_SAY_MS = 3200

/** The die and its roll. */
export const DIE = {
  /** Its size: the distance across it, in pixels, on a wide screen and on a phone (`PHONE_WIDTH`). */
  size: 132,
  phoneSize: 104,
  /** How long it tumbles across the screen before it settles, in milliseconds. */
  tumbleMs: 1700,
  /** Where it settles, as a share of the screen across and down: over the planet, under the header. */
  settle: { x: 0.5, y: 0.46 },
  /** It comes in from off the left of the screen and bounces this many times on its way. */
  bounces: 3,
  /** The first bounce's height, as a share of the screen's height. */
  hop: 0.2,
  /** How many whole turns it tumbles through before it settles. */
  turns: 3.5,
  /** How long the result stays up once the die has settled, in milliseconds; longer after a 20. */
  showMs: 3200,
  showMs20: 4600,
  /** Its faces' colours, lit, in the half-light and in shade (a cel shader's three bands), its numbers and its edges. */
  colors: {
    lit: { from: landmark.purple, toward: landmark.offWhite, k: 0.32 },
    mid: { from: landmark.purple, toward: landmark.indigo, k: 0.08 },
    shade: { from: landmark.purple, toward: landmark.indigo, k: 0.55 },
    number: landmark.offWhite,
    edge: landmark.indigo,
  },
} as const

/** The fireworks a natural 20 sets off: a few shells over the planet, from the palette, for a few seconds. */
export const FIREWORKS = {
  shells: 6,
  /** The shells go up one after another over this many seconds; each burst fades over `fade`. */
  over: 2.2,
  rise: 0.55,
  fade: 1.5,
  /** Sparks in a burst, and their speed outward (pixels a second). */
  sparks: 56,
  speed: [90, 270],
  gravity: 140,
  drag: 1.4,
  colors: [landmark.gold, landmark.pink, landmark.sky, landmark.teal, landmark.offWhite],
  /** Where the bursts open: a band across the middle of the screen's upper part, as shares of its width and height. */
  band: { x: [0.32, 0.68], y: [0.12, 0.36] },
} as const
