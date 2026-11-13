import type { people } from './sky'

/*
 * The people who stand at each place: the guide (Kylee, from her 8-bit
 * portrait) and the visitor's own character, which they put together from
 * three choices below: an age, a style and a skin tone. Every look is a
 * description that one builder (`components/world/models/Character.tsx`) turns
 * into a figure. Colours are names from `people` in `content/sky.ts`.
 */

export type SkinTone = keyof typeof people.skin
export type HairColour = keyof typeof people.hair
export type ClothColour = keyof typeof people.cloth
export type EyeColour = keyof typeof people.eyes

/** How the figure is built: narrow, middling or broad through the shoulders, hips and limbs. */
export type Build = 'slim' | 'average' | 'broad'

/** How old a figure is: a kid, a teen, an adult or an elder. Ages change a figure's proportions (lib/world/figure.ts), not only its height. */
export type Age = 'kid' | 'teen' | 'adult' | 'elder'

/** How a figure is dressed and wears its hair. It describes the look, never the visitor. */
export type Style = 'feminine' | 'masculine' | 'neutral'

/**
 * Hair: long and wavy, past the shoulders (Kylee's own); short tight curls; a
 * chin-length bob; a high bun; a short crop; a ponytail; long and straight
 * past the shoulders.
 */
export type HairStyle = 'long-wavy' | 'curls' | 'bob' | 'bun' | 'crop' | 'ponytail' | 'long'

/** The top: a button-up shirt; a hoodie with its hood down; a jumper; a cardigan open over a top; a T-shirt. */
export type TopStyle = 'shirt' | 'hoodie' | 'jumper' | 'cardigan' | 'tee'

/** Below: long trousers; shorts to the knee; a skirt to the calf. */
export type BottomStyle = 'trousers' | 'shorts' | 'skirt'

/** On the feet: heeled ankle boots; trainers; flat shoes. */
export type ShoeStyle = 'boots' | 'trainers' | 'shoes'

/** One thing worn besides: rectangular glasses, round glasses, a backpack, or nothing. */
export type Accessory = 'glasses' | 'round-glasses' | 'backpack' | 'none'

/** A character's look: everything the builder needs to draw them. */
export interface Look {
  /** How old: an adult unless said. */
  age?: Age
  build: Build
  /** Height against an average figure of its age (1): from 0.9 to 1.1. */
  height: number
  skin: SkinTone
  hair: {
    style: HairStyle
    color: HairColour
    /** Lighter streaks at the front, as Kylee's blonde ones. */
    streaks?: HairColour
  }
  /** A short beard, in this colour. */
  beard?: HairColour
  /** The eyes' colour, seen round the pupil; left out, the eyes are dark. */
  eyes?: EyeColour
  top: {
    style: TopStyle
    color: ClothColour
    /** What shows under an open cardigan, or a hoodie's strings. */
    under?: ClothColour
    /** A pattern of small marks: Kylee's shirt has little white bows. */
    pattern?: { kind: 'bows'; color: ClothColour }
    /** Sleeves to the wrist, pushed up to the forearm, or short. Long unless said. */
    sleeves?: 'long' | 'rolled' | 'short'
  }
  bottom: { style: BottomStyle; color: ClothColour }
  shoes: { style: ShoeStyle; color: ClothColour }
  /** A belt at the waist, with its buckle. */
  belt?: { color: ClothColour; buckle: ClothColour }
  accessory: Accessory
  /** The accessory's colour, where it has one. */
  accessoryColor?: ClothColour
  /** A small ring in one side of the nose. */
  noseRing?: ClothColour
  /** Standing relaxed with both arms down, or with one hand in a pocket. */
  pose?: 'relaxed' | 'hand-in-pocket'
}

/**
 * Kylee, from her 8-bit portrait: long, wavy brown hair with blonde streaks at
 * the front, parted to one side and falling past her shoulders; dark navy
 * rectangular glasses; a small nose ring; a navy button-up shirt with a
 * pattern of small white bows, its sleeves pushed up to the forearm, one hand
 * in a pocket; a black belt with a silver buckle; slim black trousers; black
 * heeled ankle boots.
 */
export const guideLook: Look = {
  build: 'slim',
  height: 1,
  skin: 'peach',
  eyes: 'blueGrey',
  hair: { style: 'long-wavy', color: 'chestnut', streaks: 'honey' },
  top: { style: 'shirt', color: 'navy', pattern: { kind: 'bows', color: 'white' }, sleeves: 'rolled' },
  bottom: { style: 'trousers', color: 'ink' },
  shoes: { style: 'boots', color: 'ink' },
  belt: { color: 'ink', buckle: 'silver' },
  accessory: 'glasses',
  // Her frames are a navy so dark it is nearly black.
  accessoryColor: 'ink',
  noseRing: 'silver',
  pose: 'hand-in-pocket',
}

/* ───────────── the visitor's character ───────────── */

/** The visitor's character, as they put it together: an age, a style and a skin tone, each by its id. */
export interface GuestChoice {
  age: Age
  style: Style
  skin: SkinTone
}

/** One choice the picker offers: its id (what is stored) and the words it shows. */
export interface GuestOption<Id extends string> {
  id: Id
  label: string
}

/**
 * What the visitor can choose, in the order the picker shows it, with the
 * words for each. The picker, the stored choice's check, the picture capture
 * and the tests all read these lists: a new age, style or tone is an entry
 * here (with its row in `wardrobe` and `hairForSkin`, and for an age its
 * proportions in lib/world/figure.ts). The style describes the look, never the
 * visitor.
 */
export const guestOptions: { age: GuestOption<Age>[]; style: GuestOption<Style>[]; skin: GuestOption<SkinTone>[] } = {
  age: [
    { id: 'kid', label: 'Kid' },
    { id: 'teen', label: 'Teen' },
    { id: 'adult', label: 'Adult' },
    { id: 'elder', label: 'Elder' },
  ],
  style: [
    { id: 'feminine', label: 'Feminine' },
    { id: 'masculine', label: 'Masculine' },
    { id: 'neutral', label: 'Neutral' },
  ],
  skin: [
    { id: 'porcelain', label: 'Pale' },
    { id: 'peach', label: 'Light' },
    { id: 'olive', label: 'Olive' },
    { id: 'golden', label: 'Golden' },
    { id: 'brown', label: 'Brown' },
    { id: 'deep', label: 'Deep' },
  ],
}

/** The character a visitor starts with, and falls back to, a field at a time, for whatever stored is not a known choice. */
export const DEFAULT_GUEST: GuestChoice = { age: 'adult', style: 'neutral', skin: 'golden' }

/**
 * What an age and a style wear: everything of a look but its skin and, unless
 * it says (an elder's silver or grey), its hair's colour. A beard is `true`
 * for one in the hair's colour.
 */
export type Outfit = Omit<Look, 'skin' | 'hair' | 'beard'> & { hair: { style: HairStyle; color?: HairColour }; beard?: true | HairColour }

/**
 * Twelve outfits, one for each age and style: plain, everyday clothes in
 * colours that are not coded pink or blue, each told from its neighbours
 * mainly by its hair and the cut of its clothes. Kids and teens read as young
 * by their proportions and their clothes (a backpack, shorts, trainers, a
 * hoodie); elders as older by silver or grey hair, glasses and a cardigan,
 * never by a stoop or a stick.
 */
export const wardrobe: Record<Age, Record<Style, Outfit>> = {
  kid: {
    feminine: {
      build: 'average', height: 1, hair: { style: 'ponytail' },
      top: { style: 'tee', color: 'teal', sleeves: 'short' }, bottom: { style: 'skirt', color: 'denim' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'backpack', accessoryColor: 'mustard',
    },
    masculine: {
      build: 'average', height: 1, hair: { style: 'crop' },
      top: { style: 'tee', color: 'rust', sleeves: 'short' }, bottom: { style: 'shorts', color: 'sage' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'backpack', accessoryColor: 'teal',
    },
    neutral: {
      build: 'average', height: 1, hair: { style: 'curls' },
      top: { style: 'jumper', color: 'mustard' }, bottom: { style: 'shorts', color: 'denim' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'backpack', accessoryColor: 'forest',
    },
  },
  teen: {
    feminine: {
      build: 'slim', height: 1, hair: { style: 'long' },
      top: { style: 'jumper', color: 'lilac' }, bottom: { style: 'trousers', color: 'denim' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'none',
    },
    masculine: {
      build: 'slim', height: 1, hair: { style: 'crop' },
      top: { style: 'hoodie', color: 'forest', under: 'cream' }, bottom: { style: 'trousers', color: 'charcoal' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'backpack', accessoryColor: 'slate',
    },
    neutral: {
      build: 'slim', height: 1, hair: { style: 'bun' },
      top: { style: 'tee', color: 'sage', sleeves: 'short' }, bottom: { style: 'shorts', color: 'charcoal' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'none',
    },
  },
  adult: {
    feminine: {
      build: 'average', height: 1, hair: { style: 'long' },
      top: { style: 'cardigan', color: 'rust', under: 'cream' }, bottom: { style: 'trousers', color: 'slate' },
      shoes: { style: 'shoes', color: 'tan' }, accessory: 'none',
    },
    masculine: {
      build: 'broad', height: 1.04, hair: { style: 'crop' }, beard: true,
      top: { style: 'jumper', color: 'plum' }, bottom: { style: 'trousers', color: 'charcoal' },
      shoes: { style: 'boots', color: 'tan' }, accessory: 'none',
    },
    neutral: {
      build: 'average', height: 1, hair: { style: 'curls' },
      top: { style: 'hoodie', color: 'teal', under: 'cream' }, bottom: { style: 'trousers', color: 'denim' },
      shoes: { style: 'trainers', color: 'white' }, accessory: 'none',
    },
  },
  elder: {
    feminine: {
      build: 'average', height: 0.98, hair: { style: 'bob', color: 'silver' },
      top: { style: 'cardigan', color: 'mustard', under: 'cream' }, bottom: { style: 'skirt', color: 'slate' },
      // Tortoiseshell frames, the shoes' tan.
      shoes: { style: 'shoes', color: 'tan' }, accessory: 'round-glasses', accessoryColor: 'tan',
    },
    masculine: {
      build: 'broad', height: 1, hair: { style: 'crop', color: 'grey' }, beard: true,
      top: { style: 'jumper', color: 'forest' }, bottom: { style: 'trousers', color: 'charcoal' },
      shoes: { style: 'shoes', color: 'ink' }, accessory: 'glasses', accessoryColor: 'charcoal',
    },
    neutral: {
      build: 'average', height: 1, hair: { style: 'curls', color: 'silver' },
      top: { style: 'cardigan', color: 'sage', under: 'cream' }, bottom: { style: 'trousers', color: 'tan' },
      shoes: { style: 'shoes', color: 'ink' }, accessory: 'round-glasses', accessoryColor: 'charcoal',
    },
  },
}

/** The hair a skin tone goes with, where the outfit does not say (an elder's is silver or grey whatever the skin). */
export const hairForSkin: Record<SkinTone, HairColour> = {
  porcelain: 'honey',
  peach: 'chestnut',
  olive: 'espresso',
  golden: 'espresso',
  brown: 'black',
  deep: 'black',
}

/* ───────────── where they stand ───────────── */

/**
 * Where a character stands at a place, in the landmark's own model units (the
 * ground is y = 0, +Z is the front, toward the camera as it arrives): `at` is
 * [x, z] across the ground from the landmark's middle, inside the place's
 * allowed footprint and clear of the landmark's parts; `turn` is which way it
 * faces, in radians about the upright (0 faces the front; positive turns it
 * toward +X). Left out, the guide faces the front, turned a little toward the
 * landmark, and the visitor's character faces the landmark.
 */
export interface Spot {
  at: [number, number]
  turn?: number
  /** How high the floor it stands on is, where it stands on the landmark's own floor (a sawdust ring, a court): 0 unless given. */
  lift?: number
}

/** Where the guide and the visitor's character stand at a place. */
export interface Stand {
  guide: Spot
  guest: Spot
}

/**
 * In front of the landmark and to its right, the guide nearer the middle and
 * the visitor's character beside her: where they stand unless their place says
 * otherwise (`standAt`).
 */
export const defaultStand: Stand = {
  guide: { at: [0.5, 0.9] },
  guest: { at: [0.8, 0.82] },
}

/**
 * Places whose landmark fills the default spots (a pond, a court, a stage, a
 * stack of coins): where the guide and the visitor's character stand there
 * instead. Either may be given alone; the other keeps the default.
 */
export const standAt: Partial<Record<string, Partial<Stand>>> = {
  // Their footprints are the smallest on the planet (each is half the gap to the other).
  home: { guest: { at: [0.74, 0.72] } },
  post: { guest: { at: [0.74, 0.72] } },
  // On the big top's sawdust ring (it covers nearly all the ground), between its guy ropes.
  ruckus: { guide: { at: [0.56, 1.02], lift: 0.02 }, guest: { at: [0.8, 0.84], lift: 0.02 } },
  // A little further in, where the neighbour is near and the footprint is smaller.
  'kingdoms-and-crowns': { guest: { at: [0.78, 0.78] } },
  'the-budget': { guest: { at: [0.78, 0.78] } },
  'three-things': { guest: { at: [0.78, 0.76] } },
  // Clear of the shop's pavement edge.
  'ember-tattoo': { guest: { at: [0.8, 0.86] } },
}
