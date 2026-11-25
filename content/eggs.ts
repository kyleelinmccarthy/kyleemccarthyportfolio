import { landmark } from './sky'

/*
 * The four easter eggs, two by day and two by night, as data: what they say
 * and how they are tuned.
 *
 * By day a bumblebee bumbles over the planet; pressing it pops it into
 * confetti with the line below and a count kept on the device. By night the
 * constellation "The Bumblebee" does the same, as often as it is pressed. By
 * day a d20 with dragon wings flies round the planet, and by night the
 * constellation "The Natural 20" hangs on the sky: pressing either (or typing
 * `roll` anywhere, at any hour) rolls a twenty-sided die across the screen; a
 * 20 sets off fireworks over the planet. The bee and the dragon die are out
 * only on the planet's overview.
 *
 * Words marked DRAFT are drafted for the owner's review.
 */

/** The constellation that rolls the die when pressed (its name in `constellations`, `content/sky.ts`). */
export const ROLL_CONSTELLATION = 'The Natural 20'
/** DRAFT: the constellation that counts a bug when pressed, as catching the bee does (its name in `constellations`). */
export const BEE_CONSTELLATION = 'The Bumblebee'

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
 * The bug: a small bumblebee. Sizes are in model units (a landmark's, `MODEL_SCALE`
 * world units each); angles over the planet in degrees of arc.
 */
export const BUG = {
  /** How far it flies a second while flying, in degrees of arc: about a landmark's footprint in five seconds. */
  speed: 1.1,
  /** It flies this many seconds, then lands for this many, as a bee does between flowers, then takes off again. */
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
  /** How high it flies over the ground, in model units, and how far it bobs up and down as it goes, this many times a second. */
  hover: 0.07,
  bob: 0.012,
  bobs: 1.6,
  /** How quickly it takes off and lands: the share of the way it rises or settles in a second, near enough. */
  lift: 6,
  /** Its wings beat this many times a second in flight, this far either way (radians), about this tilt up from flat. */
  beats: 22,
  beat: 0.55,
  open: 0.35,
} as const

/** The bumblebee's colours, from the landmark palette. */
export const bugColors = {
  /** Its fluffy thorax and the gold band round its abdomen. */
  fur: landmark.gold,
  /** Its dark abdomen, either side of the gold band: indigo, as every dark here is, never black. */
  bands: landmark.indigo,
  head: landmark.indigo,
  legs: landmark.indigo,
  eyes: landmark.offWhite,
  /** Its wings: pale, the sky softened toward white. */
  wings: { from: landmark.sky, toward: landmark.offWhite, k: 0.55 },
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

/**
 * The dragon die, by day: a d20 with dragon wings flying round the planet over
 * every landmark. Angles over the planet are in degrees of arc; heights in
 * world units (the planet's radius is 1); sizes in model units.
 */
export const DRAGON = {
  /** How far it flies a second along its loop, in degrees of arc: slow enough to catch with a press. */
  speed: 4,
  /** How far its loop's plane tips (degrees), and how many seconds the tip takes to go round once. */
  wobble: 22,
  wobblePeriod: 75,
  /** How far its flight sits above the tallest landmark's top, in world units. */
  above: 0.12,
  /** How far it bobs up and down as it flies (world units), this many times a second. */
  bob: 0.01,
  bobs: 0.7,
  /** It flaps this many seconds, then glides this many, round and round. */
  flap: 1.4,
  glide: 2.6,
  /** Its wings beat this many times a second while it flaps, this far either way (radians), about this tilt up from flat. */
  beats: 6,
  beat: 0.7,
  open: 0.25,
  /** The most it leans into a turn (radians). */
  bank: 0.5,
  /** The invisible shape that takes a press: a ball this round (model units), a little bigger than the die and its wings. */
  hit: 0.36,
  /**
   * Under reduced motion it holds still at least this many degrees from every place. Flying at its height (about 1.37),
   * it can be drawn over a point of the planet only within arccos(1 / 1.37), about 43 degrees, of the spot under it,
   * so past that it never covers a landmark from any view.
   */
  holdClear: 45,
} as const

/** The dragon die's colours, from the landmark palette: its own, not the Mountain die's purple. */
export const dragonColors = {
  /** The die and its tail: teal softened toward green, a dragon's scales. */
  die: { from: landmark.teal, toward: landmark.green, k: 0.3 },
  /** Its wings' membranes: coral warmed toward pink. */
  membrane: { from: landmark.coral, toward: landmark.pink, k: 0.25 },
  ribs: landmark.indigo,
  eyes: landmark.offWhite,
} as const

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
