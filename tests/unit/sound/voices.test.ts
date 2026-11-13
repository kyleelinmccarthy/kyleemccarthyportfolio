import { describe, it, expect } from 'vitest'
import { VOICES, sayingLength, voiceLength, type Point, type Voice } from '@/lib/sound/voices'

/*
 * The voices are plain numbers, so what makes a sound pleasant rather than a
 * harsh beep can be checked without an AudioContext: every layer swells from
 * silence and falls back to it (no click at either end), nothing is loud,
 * nothing reaches the shrill top of the range, and nothing goes on long.
 */

/** The loudest a voice may ask to be (the player's own ceiling comes on top). */
const MOST_VOLUME = 0.7
/** No filter or pitch above this: the top that reads as harsh on a small speaker. */
const HIGHEST_HZ = 6000
/** Pitch never below this: the purr's buzz, heard by its overtones. */
const LOWEST_HZ = 20
/** Every sound is short: a pet's word, not a song. */
const LONGEST = 1.6

const voices = Object.entries(VOICES) as Array<[string, Voice]>

const inOrder = (points: readonly Point[]) => points.every(([t], i) => i === 0 || t >= points[i - 1][0])

describe.each(voices)('the %s voice', (_, voice) => {
  it('is modest: its volume is under the cap, and every layer’s loudness is 0 to 1', () => {
    expect(voice.volume).toBeGreaterThan(0)
    expect(voice.volume).toBeLessThanOrEqual(MOST_VOLUME)
    for (const layer of voice.layers) for (const [, v] of layer.level) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1)
  })

  it('starts every layer at its beginning, in silence, and ends it in silence: no click in or out', () => {
    for (const layer of voice.layers) {
      expect(layer.level[0]).toEqual([0, 0])
      expect(layer.level[layer.level.length - 1][1]).toBe(0)
      expect(layer.level.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('has every glide’s points in time order, from its start', () => {
    for (const layer of voice.layers) {
      expect(inOrder(layer.level)).toBe(true)
      if (layer.kind === 'tone') {
        expect(inOrder(layer.pitch)).toBe(true)
        expect(layer.pitch[0][0]).toBe(0)
        for (const f of layer.formants ?? []) expect(inOrder(f.freq)).toBe(true), expect(f.freq[0][0]).toBe(0)
      }
    }
  })

  it('keeps out of the harsh top of the range, and every pitch and filter is a frequency a glide can reach (above zero)', () => {
    for (const layer of voice.layers) {
      if (layer.kind === 'tone') {
        expect(layer.lowpass).toBeLessThanOrEqual(HIGHEST_HZ)
        for (const [, hz] of layer.pitch) expect(hz).toBeGreaterThanOrEqual(LOWEST_HZ), expect(hz).toBeLessThanOrEqual(HIGHEST_HZ)
        for (const f of layer.formants ?? []) {
          for (const [, hz] of f.freq) expect(hz).toBeGreaterThan(0), expect(hz).toBeLessThanOrEqual(HIGHEST_HZ)
          expect(f.q).toBeGreaterThan(0)
          expect(f.gain).toBeGreaterThan(0)
        }
        if (layer.vibrato) expect(Math.abs(layer.vibrato.cents)).toBeLessThanOrEqual(50)
      } else {
        expect(layer.filter.freq).toBeGreaterThan(0)
        expect(layer.filter.freq).toBeLessThanOrEqual(HIGHEST_HZ)
      }
      if (layer.flutter) expect(layer.flutter.depth).toBeGreaterThan(0), expect(layer.flutter.depth).toBeLessThanOrEqual(1)
    }
  })

  it('is short', () => {
    expect(sayingLength(voice)).toBeGreaterThan(0.1)
    expect(voiceLength(voice)).toBeLessThanOrEqual(LONGEST)
  })

  it('said more than once, leaves a gap between its sayings rather than running them together', () => {
    if (!voice.repeat) return
    expect(voice.repeat.times).toBeGreaterThanOrEqual(2)
    expect(voice.repeat.every).toBeGreaterThan(sayingLength(voice))
  })
})

describe('the voices', () => {
  it('sound like their animals: a meow glides up and then down, a bark drops, a purr is a low rumble', () => {
    const tone = (v: Voice) => v.layers.find((l) => l.kind === 'tone')!
    const pitch = (v: Voice) => (tone(v) as Extract<Voice['layers'][number], { kind: 'tone' }>).pitch.map(([, hz]) => hz)
    for (const cat of [VOICES.meow, VOICES.softMeow, VOICES.mew]) {
      const p = pitch(cat)
      expect(Math.max(...p)).toBeGreaterThan(p[0])
      expect(p[p.length - 1]).toBeLessThan(Math.max(...p))
    }
    for (const dog of [VOICES.woof, VOICES.arf]) {
      const p = pitch(dog)
      expect(p[p.length - 1]).toBeLessThan(p[0])
    }
    expect(Math.max(...pitch(VOICES.purr))).toBeLessThan(40)
    expect(pitch(VOICES.woof)[0]).toBeLessThan(pitch(VOICES.arf)[0])
    expect(pitch(VOICES.mew)[0]).toBeGreaterThan(pitch(VOICES.meow)[0])
  })

  it('a repeated voice is its single one, said again', () => {
    expect(voiceLength(VOICES.woofWoof)).toBeCloseTo(sayingLength(VOICES.woof) + VOICES.woofWoof.repeat.every, 9)
    expect(VOICES.woofWoof.layers).toBe(VOICES.woof.layers)
  })
})
