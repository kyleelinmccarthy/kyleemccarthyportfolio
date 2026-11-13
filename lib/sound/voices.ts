/*
 * The pets' voices, as plain numbers: what each sound is made of, never how
 * it is played. `lib/sound/player.ts` turns a voice into Web Audio nodes; here
 * nothing touches an AudioContext, so every voice is checked by unit tests
 * (that it starts and ends in silence, stays modest, keeps out of the harsh
 * top of the range).
 *
 * A voice is a few layers sounding together. A tone is an oscillator whose
 * pitch glides along its points, shaped through formants (band-pass filters
 * that stand for a mouth's vowel, gliding as the vowel changes: the "i-a-ow"
 * of a meow, the "w-oo" of a woof) and softened by a low-pass. A noise layer
 * is filtered noise: a breath, the burst at the start of a bark, a purr's
 * rumble. Every layer has its own loudness over time, and may flutter (its
 * loudness pulsing quickly: a purr's 25-odd beats a second, a chirrup's
 * rolled r).
 */

/** A moment (seconds from the start of the voice) and a value then: pitch in Hz, loudness 0 to 1, a filter's centre in Hz. */
export type Point = readonly [seconds: number, value: number]

/** A quick pulsing of a layer's loudness: `rate` pulses a second, `depth` 0 (none) to 1 (down to silence). */
export interface Flutter {
  rate: number
  depth: number
}

/** A resonance a tone is shaped through: a band-pass whose centre glides along `freq`, `q` sharp, `gain` its share of the layer. */
export interface Formant {
  freq: Point[]
  q: number
  gain: number
}

/** An oscillator, gliding in pitch, shaped through formants and softened by a low-pass. */
export interface Tone {
  kind: 'tone'
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
  /** Its pitch, in Hz: glides between the points as the ear hears pitch (exponentially). */
  pitch: Point[]
  /** Its loudness, 0 to 1: straight between the points, from silence to silence. */
  level: Point[]
  /** A gentle wobble in pitch: `rate` a second, `cents` either way. */
  vibrato?: { rate: number; cents: number }
  /** Its vowel. With none, the tone is heard through the low-pass alone. */
  formants?: Formant[]
  /** Everything above this, in Hz, is taken off: no harsh top. */
  lowpass: number
  flutter?: Flutter
}

/** Noise, filtered: a breath, the burst of a bark, a purr's rumble. */
export interface Noise {
  kind: 'noise'
  filter: { type: 'bandpass' | 'lowpass'; freq: number; q: number }
  /** Its loudness, 0 to 1: straight between the points, from silence to silence. */
  level: Point[]
  flutter?: Flutter
}

export type Layer = Tone | Noise

/** One sound: its layers, how loud it is at its loudest (0 to 1, under the player's own ceiling), and how many times it is said. */
export interface Voice {
  volume: number
  layers: Layer[]
  /** Said `times` times, each `every` seconds after the last ("woof woof"). Once if not given. */
  repeat?: { times: number; every: number }
}

/** How long one saying of a voice lasts, in seconds: until its last layer falls silent. */
export function sayingLength(voice: Voice): number {
  return Math.max(0, ...voice.layers.map((layer) => layer.level[layer.level.length - 1]?.[0] ?? 0))
}

/** How long a voice lasts, every saying of it, in seconds. */
export function voiceLength(voice: Voice): number {
  const { times = 1, every = 0 } = voice.repeat ?? {}
  return sayingLength(voice) + Math.max(0, times - 1) * every
}

/* ───────────── the cats ───────────── */

/**
 * A cat's "mi-a-ow": a sawtooth (a voice's buzz) rising from about 560 Hz to
 * 820 and falling away to 480 as the mouth opens and closes, its vowel moving
 * from a closed "m-i" (low first formant, high second) through an open "a" to
 * a rounded "ow" (both low), with a little vibrato and a breath under it.
 */
const meow: Voice = {
  volume: 0.5,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      pitch: [
        [0, 560],
        [0.13, 820],
        [0.32, 760],
        [0.62, 480],
      ],
      level: [
        [0, 0],
        [0.05, 0.7],
        [0.15, 1],
        [0.42, 0.8],
        [0.62, 0],
      ],
      vibrato: { rate: 5.5, cents: 25 },
      formants: [
        {
          freq: [
            [0, 350],
            [0.15, 900],
            [0.4, 700],
            [0.62, 420],
          ],
          q: 5,
          gain: 1,
        },
        {
          freq: [
            [0, 1900],
            [0.15, 1600],
            [0.4, 1100],
            [0.62, 850],
          ],
          q: 7,
          gain: 0.6,
        },
        {
          freq: [
            [0, 2800],
            [0.62, 2500],
          ],
          q: 9,
          gain: 0.2,
        },
      ],
      lowpass: 4000,
    },
    {
      kind: 'noise',
      filter: { type: 'bandpass', freq: 2500, q: 0.8 },
      level: [
        [0, 0],
        [0.05, 0.06],
        [0.5, 0.04],
        [0.62, 0],
      ],
    },
  ],
}

/** The same meow, lower and slower, said softly: an older cat's. */
const softMeow: Voice = {
  volume: 0.4,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      pitch: [
        [0, 430],
        [0.18, 600],
        [0.45, 540],
        [0.78, 360],
      ],
      level: [
        [0, 0],
        [0.08, 0.6],
        [0.2, 1],
        [0.55, 0.7],
        [0.78, 0],
      ],
      vibrato: { rate: 4.5, cents: 20 },
      formants: [
        {
          freq: [
            [0, 330],
            [0.2, 800],
            [0.55, 620],
            [0.78, 400],
          ],
          q: 5,
          gain: 1,
        },
        {
          freq: [
            [0, 1700],
            [0.2, 1400],
            [0.55, 1000],
            [0.78, 800],
          ],
          q: 7,
          gain: 0.55,
        },
      ],
      lowpass: 3200,
    },
  ],
}

/**
 * A purr: two slow breaths, out and in, the in-breath a little lower and
 * quieter. A low sawtooth at about 26 Hz under a 320 Hz low-pass (a buzz you
 * hear by its overtones, as on a phone's speaker), and soft low noise pulsing
 * at the same rate (the rumble), each swelling in and fading out.
 */
const purr: Voice = {
  volume: 0.55,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      pitch: [
        [0, 26],
        [0.7, 27],
        [0.8, 23],
        [1.5, 24],
      ],
      level: [
        [0, 0],
        [0.18, 0.8],
        [0.62, 0.75],
        [0.76, 0.12],
        [0.9, 0.55],
        [1.32, 0.5],
        [1.5, 0],
      ],
      lowpass: 320,
    },
    {
      kind: 'noise',
      filter: { type: 'lowpass', freq: 480, q: 0.7 },
      level: [
        [0, 0],
        [0.18, 0.6],
        [0.62, 0.55],
        [0.76, 0.1],
        [0.9, 0.42],
        [1.32, 0.38],
        [1.5, 0],
      ],
      flutter: { rate: 26, depth: 0.85 },
    },
  ],
}

/** A chirrup: a short questioning "mrrp?", a sawtooth rising from 480 Hz to 880 through a closed then opening vowel, its loudness rolled quickly like an r. */
const chirp: Voice = {
  volume: 0.45,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      pitch: [
        [0, 480],
        [0.12, 560],
        [0.26, 880],
      ],
      level: [
        [0, 0],
        [0.03, 0.8],
        [0.18, 1],
        [0.26, 0],
      ],
      formants: [
        {
          freq: [
            [0, 380],
            [0.26, 750],
          ],
          q: 5,
          gain: 1,
        },
        {
          freq: [
            [0, 1500],
            [0.26, 1900],
          ],
          q: 7,
          gain: 0.5,
        },
      ],
      lowpass: 4000,
      flutter: { rate: 32, depth: 0.5 },
    },
  ],
}

/** A kitten's "mew": higher and shorter than a cat's meow, from 900 Hz up to 1250 and down to 950. */
const mew: Voice = {
  volume: 0.42,
  layers: [
    {
      kind: 'tone',
      wave: 'sawtooth',
      pitch: [
        [0, 900],
        [0.08, 1250],
        [0.3, 950],
      ],
      level: [
        [0, 0],
        [0.03, 0.85],
        [0.1, 1],
        [0.22, 0.7],
        [0.3, 0],
      ],
      vibrato: { rate: 7, cents: 20 },
      formants: [
        {
          freq: [
            [0, 500],
            [0.1, 1000],
            [0.3, 700],
          ],
          q: 5,
          gain: 1,
        },
        {
          freq: [
            [0, 2300],
            [0.1, 2000],
            [0.3, 1500],
          ],
          q: 7,
          gain: 0.55,
        },
      ],
      lowpass: 5000,
    },
  ],
}

/* ───────────── the dogs ───────────── */

/**
 * A bark, from a dog of `pitch` (its voice's starting note, in Hz): a breathy
 * burst of noise at the start, a sawtooth that jumps up a little and drops
 * away fast through a rounded "w-oo" vowel, and the soft "f" of breath at the
 * end. `length` is how long it rings; `vowel` scales its formants (a smaller
 * dog's mouth rings higher).
 */
function bark({ pitch, length, vowel, volume }: { pitch: number; length: number; vowel: number; volume: number }): Voice {
  const at = (share: number) => +(length * share).toFixed(4)
  return {
    volume,
    layers: [
      {
        kind: 'tone',
        wave: 'sawtooth',
        pitch: [
          [0, pitch],
          [at(0.18), pitch * 1.13],
          [length, pitch * 0.65],
        ],
        level: [
          [0, 0],
          [at(0.07), 1],
          [at(0.32), 0.8],
          [length, 0],
        ],
        formants: [
          {
            freq: [
              [0, 450 * vowel],
              [at(0.22), 650 * vowel],
              [length, 400 * vowel],
            ],
            q: 4,
            gain: 1,
          },
          {
            freq: [
              [0, 800 * vowel],
              [at(0.22), 1100 * vowel],
              [length, 700 * vowel],
            ],
            q: 5,
            gain: 0.5,
          },
        ],
        lowpass: 2200 * vowel,
      },
      {
        kind: 'noise',
        filter: { type: 'bandpass', freq: 900 * vowel, q: 1.2 },
        level: [
          [0, 0],
          [at(0.05), 0.5],
          [at(0.22), 0.2],
          [at(0.55), 0],
        ],
      },
      {
        kind: 'noise',
        filter: { type: 'bandpass', freq: 3000, q: 1 },
        level: [
          [0, 0],
          [at(0.55), 0],
          [at(0.72), 0.12],
          [length * 1.15, 0],
        ],
      },
    ],
  }
}

/** The large dog's deep "woof": from about 230 Hz, ringing a fifth of a second. */
const woof = bark({ pitch: 230, length: 0.22, vowel: 1, volume: 0.6 })
/** The medium dog's higher, snappier "arf": from about 420 Hz, a seventh of a second, its mouth ringing higher. */
const arf = bark({ pitch: 420, length: 0.15, vowel: 1.4, volume: 0.5 })

/** Every voice, by name: what the pets' content (`content/pets.ts`) names. */
export const VOICES = {
  meow,
  softMeow,
  purr,
  chirp,
  mew,
  mewMew: { ...mew, repeat: { times: 2, every: 0.36 } },
  woof,
  woofWoof: { ...woof, repeat: { times: 2, every: 0.32 } },
  arf,
  arfArf: { ...arf, repeat: { times: 2, every: 0.21 } },
} as const satisfies Record<string, Voice>

export type VoiceId = keyof typeof VOICES
