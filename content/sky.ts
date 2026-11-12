import type { Constellation, LookKey, SkyLook } from './types'

/**
 * The four skies. Every colour the planet, sea, clouds and stars draw with
 * comes from here, so a component never carries its own hex value.
 */
export const looks: Record<LookKey, SkyLook> = {
  morning: { top: '#74BEFF', mid: '#C4E6FF', bot: '#FFE4C6', sunCol: '#FFE2A8', sunK: 1, moonK: 0, star: 0, shade: '#A9B9F2', lit: '#FFFAEF', rim: '#FFF1DA', rimK: 0.5, atmo: '#E2F3FF', cloudLit: '#FFFFFF', cloudShade: '#B4C9F5', deep: '#2360D8', sea: '#3A8CF2', shallow: '#74DCEC', glint: '#FFF4D2', sunY: 0.74, glow: 1, city: '#000000' },
  afternoon: { top: '#3A92FA', mid: '#86C9FF', bot: '#DDF3FF', sunCol: '#FFF4D0', sunK: 1, moonK: 0, star: 0, shade: '#9CB0F4', lit: '#FFFFFF', rim: '#D2ECFF', rimK: 0.5, atmo: '#C4E8FF', cloudLit: '#FFFFFF', cloudShade: '#A6C2F3', deep: '#1D58CF', sea: '#2E82F2', shallow: '#5FD6EE', glint: '#FFFFFF', sunY: 0.8, glow: 1, city: '#000000' },
  evening: { top: '#7C88EA', mid: '#F4A3BA', bot: '#FFD59C', sunCol: '#FFB06A', sunK: 1.1, moonK: 0, star: 0.25, shade: '#8C7BD0', lit: '#FFDCC0', rim: '#FFC2A0', rimK: 0.75, atmo: '#FFC9BC', cloudLit: '#FFDFC8', cloudShade: '#A183C8', deep: '#3344AE', sea: '#5C6FD8', shallow: '#F0A6C0', glint: '#FFD9A8', sunY: 0.58, glow: 1.5, city: '#3A2A0A' },
  night: { top: '#04071A', mid: '#0D1340', bot: '#252F78', sunCol: '#000000', sunK: 0, moonK: 1, star: 1, shade: '#39428F', lit: '#97A8F5', rim: '#7F9BFF', rimK: 0.65, atmo: '#5B78FF', cloudLit: '#6272B4', cloudShade: '#151B42', deep: '#0A1C66', sea: '#12308F', shallow: '#2A5CC4', glint: '#BFD0FF', sunY: 0.8, glow: 2.3, city: '#8A6A22' },
}

/**
 * The planet's own colours, the same at every hour; the light of the look
 * tints them. Grass blends between the two greens, sand rings each shore and
 * floors the sea, foam is the surf, and the graticule is the faint grid.
 */
export const terrain = {
  grassA: '#7FD67A',
  grassB: '#A6E27E',
  sand: '#FFE6B3',
  foam: '#FFFFFF',
  graticule: '#FFFFFF',
  /** Thin outlines round landmarks: dark indigo, never black. */
  outline: '#2A2352',
} as const

/**
 * The landmarks' palette: every landmark is coloured from this and its
 * district's colour, nothing else. It is the look test's palette, softened:
 * no flat primaries, the whites warm, the darks indigo rather than black, so
 * that under cel shading with coloured shadows the landmarks read as painted
 * rather than plastic. `lit` is window glass: warm amber by day, and, drawn
 * with the glow material, it brightens into a lit window as the light falls.
 */
export const landmark = {
  offWhite: '#F7F3F9',
  cream: '#FAEAD2',
  coral: '#E97F74',
  /**
   * A deep warm red, never a flat primary, for the few things the owner's own
   * art paints red: the Doll's eyes, the finish line, the dumpster's disc.
   * Low in green and blue, so it still glows red when lit, where every other
   * warm colour here turns peach.
   */
  red: '#CF464B',
  pink: '#F29CBB',
  gold: '#EFC466',
  orange: '#EFA06A',
  blue: '#5C84E0',
  sky: '#A6CDEF',
  teal: '#46B5AB',
  green: '#5EAC7A',
  purple: '#8F7BDA',
  stone: '#E1DCEA',
  slate: '#8E98B2',
  indigo: '#3C3767',
  brick: '#BE6C5E',
  wood: '#C69A6E',
  sand: '#F1DCB4',
  glass: '#BDDAF0',
  lit: '#E5B172',
} as const

/**
 * The small life on the planet: trees, background buildings, routes and the
 * paddleboarder. Everything here is muted, so it sits behind the landmarks.
 * A traveller on a route takes the colour of the district it leaves
 * (`District.color`), so it is not here.
 */
export const scatter = {
  /**
   * Broad-leaved canopies: greens a shade deeper and cooler than the grass, so
   * a tree reads against it, from yellow-green to blue-green. Neighbours take
   * different ones.
   */
  leaf: ['#4F9A69', '#5AA46D', '#64AC6F', '#4C9272', '#6DAA66'],
  /** Conifers: deeper and bluer than the broad-leaved greens. */
  conifer: ['#3F7D6E', '#477F72', '#3C7368'],
  /** Blossom, an accent round The Studio and Home: a soft, greyed pink, never candy. */
  blossom: ['#DFB0BD', '#D6A2B2', '#E4BCC6'],
  /** A few turning trees in After Hours. */
  autumn: ['#CF9C62', '#C48C62'],
  /** Bark: the landmarks' wood taken toward indigo. */
  trunk: '#85675D',
  /** Background buildings: muted, greyed walls a step darker than any landmark's, so the landmarks lead. */
  walls: ['#A29CAC', '#A69E93', '#97A0AE', '#A3999A', '#98A0A8'],
  /** Their plinths, parapets and rooftop huts. */
  trim: ['#8A8FA3', '#958B98', '#7F8899'],
  /** Roofs, flat and pitched, darker than the walls: slate, dusty indigo, dusty teal, softened terracotta. */
  roofs: ['#7A839C', '#7B7597', '#6C918F', '#A97B6C', '#7088A0'],
  /** A window with nobody home: dark glass that stays dark at night. */
  windowOff: '#7F8DAA',
  /** A background window lit at night: warm, and dimmer than a landmark's (`landmark.lit`). */
  windowLit: '#B69466',
  /** The dashed route lines. */
  route: '#FFFFFF',
  /** A generic paddleboarder: board, body, skin and paddle. */
  paddle: { board: '#FFD166', body: '#2EC4B6', skin: '#FFD9B8', blade: '#D09B62' },
} as const

/**
 * A colour handed to a shader as it stands: red, green and blue in linear
 * light, not parsed from sRGB. Values above 1 are brighter than white, for the
 * bloom to catch.
 */
export type LinearRgb = readonly [number, number, number]

/**
 * The night sky's colours. The star tints are linear multipliers, as the star
 * shader takes them (it brightens them further); dust is a random mix between
 * its two ends, channel by channel. The comet's tails and the constellation
 * lines are ordinary sRGB colours, and the label colour is for the page.
 */
export const night = {
  /** Most scattered stars are cream; a quarter are cool white and a fifth warm. */
  starCream: [1, 1, 0.95],
  starWhite: [1, 1, 1],
  starWarm: [1, 0.86, 0.7],
  /** The Milky Way's band of small blue-white stars. */
  starBand: [0.85, 0.9, 1],
  /** The faint glow behind the band. */
  dustFrom: [0.03, 0.035, 0.075],
  dustTo: [0.05, 0.035, 0.105],
  /** The stars at a constellation's corners, and the comet's head. */
  figureStar: [1, 0.96, 0.78],
  cometHead: [0.85, 1, 1],
  /** The comet's long blue tail and its shorter pink one, both whitening into its core at the head. */
  cometTail: '#7FD8FF',
  cometTailShort: '#FF9AD5',
  cometCore: [1, 1, 1],
  constellationLine: '#CFE0FF',
  constellationLabel: '#C9D4FF',
} as const satisfies Record<string, LinearRgb | string>

/**
 * The sun, the moon and the shooting stars on the sky dome, as linear
 * light. The discs are brighter than white, so they bloom.
 */
export const celestial = {
  sunDisc: [2.0, 1.85, 1.5],
  moonHalo: [0.5, 0.6, 1.0],
  moonDisc: [2.3, 2.2, 1.75],
  shootingStar: [2.0, 2.2, 3.0],
} as const satisfies Record<string, LinearRgb>

/** `from` is the first hour of each band; the small hours wrap round to the last. */
export const greetings: Array<{ from: number; text: string }> = [
  { from: 5, text: 'Morning.' },
  { from: 12, text: 'Afternoon.' },
  { from: 17, text: 'Evening.' },
  { from: 22, text: 'Up late? So am I.' },
]

export const welcome = 'Come have a look around.'

/** Day runs from 06:00 up to, but not including, 19:00. */
export const dayHours = { from: 6, to: 19 } as const

// The Natural 20 is a hexagon; compute it the way the look test does.
const D2R = Math.PI / 180
const hexagon = Array.from({ length: 6 }, (_, k): [number, number] => [
  Math.cos((90 + 60 * k) * D2R) * 3,
  Math.sin((90 + 60 * k) * D2R) * 3,
])

export const constellations: Constellation[] = [
  {
    name: 'The Crown',
    at: { lat: -10, lon: -166 },
    points: [[-4, -2], [-4, 2], [-2, 0], [0, 3], [2, 0], [4, 2], [4, -2]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  },
  {
    name: 'Jimothy Major',
    at: { lat: -15, lon: 153 },
    points: [[-3, 2], [-2, 4], [-1, 2.4], [1, 2.4], [2, 4], [3, 2], [2, -1], [0, -2.5], [-2, -1], [-1, 0.6], [1, 0.6]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]],
  },
  {
    name: 'The Natural 20',
    at: { lat: 10, lon: 66 },
    points: hexagon,
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 2], [2, 4], [4, 0]],
  },
  {
    name: 'The Pencil',
    at: { lat: -6, lon: -72 },
    points: [[-4, -1], [3, -1], [4.6, 0], [3, 1], [-4, 1]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 3]],
  },
]
