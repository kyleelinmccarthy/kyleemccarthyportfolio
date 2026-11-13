import { sayingLength, voiceLength, type Flutter, type Layer, type Point, type Voice } from './voices'

/*
 * The one thin player that turns a voice (`lib/sound/voices.ts`, plain
 * numbers) into Web Audio nodes and plays it. Its audio context is made on
 * the first sound, which only ever follows a press (a user gesture, so the
 * browser allows it): never on load, never on its own. Where Web Audio is
 * missing, or anything in it throws, there is simply no sound. One sound at a
 * time: a new one fades the last out in a few hundredths of a second, so
 * rapid presses never pile up, and every node a sound made is let go once it
 * is over.
 */

/** Every sound is played at its voice's volume times this: modest, under whatever else the visitor is listening to. */
export const CEILING = 0.35
/** How far ahead of now a sound is scheduled, in seconds: room for the nodes to be wired before it starts. */
const LEAD = 0.02
/** How quickly a sound cut short fades away, in seconds: quick, but never a click. */
const FADE = 0.03
/** How long the sources run on past the voice's end, in seconds, before they stop. */
const TAIL = 0.05
/** Seconds of noise kept for the noise layers, looped. */
const NOISE_SECONDS = 1

/** Plays the pets' voices. */
export interface Player {
  /** Plays `voice`, cutting short whatever was sounding. Silent where Web Audio cannot be had. */
  play(voice: Voice): void
  /** Fades out whatever is sounding. */
  stop(): void
}

/** The browser's audio context, or null where there is none. */
function browserContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Context ? new Context() : null
}

/** A second of white noise for `ctx`, made once and shared by every noise layer. */
const noiseFor = new WeakMap<BaseAudioContext, AudioBuffer>()
function noise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseFor.get(ctx)
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseFor.set(ctx, buffer)
  }
  return buffer
}

/** Moves `param` along `points` from `start`: straight between them, or (for a pitch or a filter's centre) as the ear hears pitch. */
function glide(param: AudioParam, points: readonly Point[], start: number, curve: 'linear' | 'exp'): void {
  const [first, ...rest] = points
  if (!first) return
  param.setValueAtTime(first[1], start + first[0])
  for (const [t, v] of rest) {
    if (curve === 'exp') param.exponentialRampToValueAtTime(Math.max(v, 1e-4), start + t)
    else param.linearRampToValueAtTime(v, start + t)
  }
}

/** One sound being made: its nodes (to let go), its sources (to start and stop) and the gain all of it runs through. */
interface Sound {
  out: GainNode
  nodes: AudioNode[]
  sources: AudioScheduledSourceNode[]
}

/** A gain that pulses `flutter.rate` times a second between full and `1 - flutter.depth`, through which `from` is played on to `to`. */
function flutterThrough(ctx: BaseAudioContext, sound: Sound, flutter: Flutter, from: AudioNode, to: AudioNode): void {
  const depth = Math.min(1, Math.max(0, flutter.depth))
  const gate = ctx.createGain()
  gate.gain.value = 1 - depth / 2
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = flutter.rate
  const swing = ctx.createGain()
  swing.gain.value = depth / 2
  lfo.connect(swing).connect(gate.gain)
  from.connect(gate).connect(to)
  sound.nodes.push(gate, lfo, swing)
  sound.sources.push(lfo)
}

/** Builds one layer of a saying that starts at `start`, played into the sound's gain. */
function layer(ctx: BaseAudioContext, sound: Sound, l: Layer, start: number): void {
  const level = ctx.createGain()
  level.gain.value = 0
  glide(level.gain, l.level, start, 'linear')
  sound.nodes.push(level)
  if (l.flutter) flutterThrough(ctx, sound, l.flutter, level, sound.out)
  else level.connect(sound.out)

  if (l.kind === 'noise') {
    const source = ctx.createBufferSource()
    source.buffer = noise(ctx)
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = l.filter.type
    filter.frequency.value = l.filter.freq
    filter.Q.value = l.filter.q
    source.connect(filter).connect(level)
    sound.nodes.push(source, filter)
    sound.sources.push(source)
    return
  }

  const tone = ctx.createOscillator()
  tone.type = l.wave
  glide(tone.frequency, l.pitch, start, 'exp')
  sound.nodes.push(tone)
  sound.sources.push(tone)
  if (l.vibrato) {
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = l.vibrato.rate
    const cents = ctx.createGain()
    cents.gain.value = l.vibrato.cents
    lfo.connect(cents).connect(tone.detune)
    sound.nodes.push(lfo, cents)
    sound.sources.push(lfo)
  }
  const soften = ctx.createBiquadFilter()
  soften.type = 'lowpass'
  soften.frequency.value = l.lowpass
  soften.Q.value = 0.7
  soften.connect(level)
  sound.nodes.push(soften)
  if (!l.formants?.length) {
    tone.connect(soften)
    return
  }
  // The vowel: the tone through each formant side by side, mixed at its share.
  for (const f of l.formants) {
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = f.q
    glide(band.frequency, f.freq, start, 'exp')
    const share = ctx.createGain()
    share.gain.value = f.gain
    tone.connect(band).connect(share).connect(soften)
    sound.nodes.push(band, share)
  }
}

/**
 * A player that gets its audio context from `makeContext` (the browser's by
 * default), once, on its first sound. Every sound goes through one gentle
 * limiter, so however the layers add up nothing comes out harsh or clipped.
 */
export function createPlayer(makeContext: () => AudioContext | null = browserContext): Player {
  // Undefined until the first sound; null if none could be made (and then none is tried for again).
  let ctx: AudioContext | null | undefined
  let limiter: DynamicsCompressorNode | null = null
  let current: { sound: Sound; cut(at: number): void } | null = null

  const context = (): AudioContext | null => {
    if (ctx !== undefined) return ctx
    try {
      ctx = makeContext()
      if (ctx) {
        limiter = ctx.createDynamicsCompressor()
        limiter.threshold.value = -14
        limiter.knee.value = 8
        limiter.ratio.value = 10
        limiter.attack.value = 0.003
        limiter.release.value = 0.12
        limiter.connect(ctx.destination)
      }
    } catch {
      ctx = null
    }
    return ctx
  }

  const cutCurrent = (at: number) => {
    const playing = current
    current = null
    playing?.cut(at)
  }

  return {
    play(voice) {
      try {
        const ac = context()
        if (!ac || !limiter) return
        if (ac.state === 'suspended') void ac.resume().catch(() => undefined)
        const now = ac.currentTime
        cutCurrent(now)

        const start = now + LEAD
        const end = start + voiceLength(voice)
        const out = ac.createGain()
        out.gain.value = voice.volume * CEILING
        out.connect(limiter)
        const sound: Sound = { out, nodes: [out], sources: [] }
        const { times = 1, every = sayingLength(voice) } = voice.repeat ?? {}
        for (let i = 0; i < Math.max(1, times); i++) for (const l of voice.layers) layer(ac, sound, l, start + i * every)

        // Let go of every node once the last source has stopped (or, should the browser never say so, soon after).
        let left = sound.sources.length
        let timer = 0
        const release = () => {
          window.clearTimeout(timer)
          for (const node of sound.nodes) {
            try {
              node.disconnect()
            } catch {
              // Already let go.
            }
          }
          if (current?.sound === sound) current = null
        }
        timer = window.setTimeout(release, (end - now + TAIL + 0.5) * 1000)
        for (const source of sound.sources) {
          source.onended = () => {
            left--
            if (left === 0) release()
          }
          source.start(start)
          source.stop(end + TAIL)
        }
        current = {
          sound,
          cut(at) {
            try {
              out.gain.cancelScheduledValues(at)
              out.gain.setValueAtTime(out.gain.value, at)
              out.gain.linearRampToValueAtTime(0, at + FADE)
              for (const source of sound.sources) source.stop(at + FADE + 0.01)
            } catch {
              release()
            }
          },
        }
      } catch {
        // No sound; nothing else changes.
      }
    },
    stop() {
      try {
        if (ctx) cutCurrent(ctx.currentTime)
      } catch {
        // Nothing was sounding.
      }
    },
  }
}

/** The pets' player: one for the page. */
export const petVoices = createPlayer()
