import { describe, it, expect, vi } from 'vitest'
import { CEILING, createPlayer } from '@/lib/sound/player'
import { VOICES } from '@/lib/sound/voices'

/*
 * The player against a stand-in for the Web Audio API that records what is
 * made, connected, started, stopped and let go. No sound is made: what is
 * checked is that nothing is made before the first press, that a press where
 * Web Audio is missing or throws is silent rather than an error, that a new
 * sound cuts the one before instead of piling on it, and that every node is
 * let go once its sound is over.
 */

class FakeParam {
  value = 0
  calls: Array<[string, ...number[]]> = []
  setValueAtTime(v: number, t: number) {
    this.calls.push(['set', v, t])
    return this
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(['linear', v, t])
    return this
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (!(v > 0)) throw new RangeError('an exponential ramp needs a value above zero')
    this.calls.push(['exp', v, t])
    return this
  }
  cancelScheduledValues(t: number) {
    this.calls.push(['cancel', t])
    return this
  }
}

class FakeNode {
  connected = new Set<FakeNode | FakeParam>()
  disconnected = false
  constructor(readonly kind: string) {}
  connect(to: FakeNode | FakeParam) {
    this.connected.add(to)
    return to
  }
  disconnect() {
    this.disconnected = true
    this.connected.clear()
  }
}

class FakeSource extends FakeNode {
  started: number | null = null
  stoppedAt: number[] = []
  onended: (() => void) | null = null
  type = ''
  buffer: unknown = null
  loop = false
  frequency = new FakeParam()
  detune = new FakeParam()
  start(t = 0) {
    this.started = t
  }
  stop(t = 0) {
    this.stoppedAt.push(t)
  }
}

class FakeContext {
  static made = 0
  currentTime = 1
  state = 'running'
  sampleRate = 8000
  nodes: FakeNode[] = []
  destination = new FakeNode('destination')
  constructor() {
    FakeContext.made++
  }
  private make<T extends FakeNode>(node: T): T {
    this.nodes.push(node)
    return node
  }
  createGain() {
    return Object.assign(this.make(new FakeNode('gain')), { gain: new FakeParam() })
  }
  createBiquadFilter() {
    return Object.assign(this.make(new FakeNode('filter')), { type: '', frequency: new FakeParam(), Q: new FakeParam() })
  }
  createDynamicsCompressor() {
    return Object.assign(this.make(new FakeNode('compressor')), {
      threshold: new FakeParam(),
      knee: new FakeParam(),
      ratio: new FakeParam(),
      attack: new FakeParam(),
      release: new FakeParam(),
    })
  }
  createOscillator() {
    return this.make(new FakeSource('oscillator'))
  }
  createBufferSource() {
    return this.make(new FakeSource('noise'))
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  sources() {
    return this.nodes.filter((n): n is FakeSource => n instanceof FakeSource)
  }
}

const fake = () => {
  const ctx = new FakeContext()
  const make = vi.fn(() => ctx as unknown as AudioContext)
  return { ctx, make, player: createPlayer(make) }
}

/** Every source made ends, as the browser would say once each has stopped. */
const endAll = (ctx: FakeContext) => {
  for (const s of ctx.sources()) s.onended?.()
}

describe('the sound player', () => {
  it('makes no audio context until the first sound: never on load', () => {
    const { make } = fake()
    expect(make).not.toHaveBeenCalled()
  })

  it('makes one context on the first sound and keeps it for the rest', () => {
    const { make, player } = fake()
    player.play(VOICES.meow)
    player.play(VOICES.woof)
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('wakes a context the browser has suspended, on the press itself', () => {
    const { ctx, player } = fake()
    ctx.state = 'suspended'
    player.play(VOICES.meow)
    expect(ctx.resume).toHaveBeenCalled()
  })

  it('is silent, never an error, where Web Audio is missing or throws', () => {
    expect(() => createPlayer(() => null).play(VOICES.meow)).not.toThrow()
    const throwing = createPlayer(() => {
      throw new Error('no audio here')
    })
    expect(() => throwing.play(VOICES.meow)).not.toThrow()
    expect(() => throwing.play(VOICES.meow)).not.toThrow()
    const ctx = new FakeContext()
    ctx.createOscillator = () => {
      throw new Error('broken')
    }
    expect(() => createPlayer(() => ctx as unknown as AudioContext).play(VOICES.meow)).not.toThrow()
  })

  it('tries for a context only once: where it cannot be made, it does not try on every press', () => {
    const make = vi.fn(() => null)
    const player = createPlayer(make)
    player.play(VOICES.meow)
    player.play(VOICES.meow)
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('stays under its ceiling: the loudest gain it asks for is the voice’s volume times the ceiling', () => {
    const { ctx, player } = fake()
    player.play(VOICES.woof)
    const out = ctx.nodes.filter((n) => n.kind === 'gain').map((n) => (n as unknown as { gain: FakeParam }).gain)
    const most = Math.max(...out.flatMap((g) => [g.value, ...g.calls.filter((c) => c[0] !== 'cancel').map((c) => c[1])]))
    expect(CEILING).toBeLessThanOrEqual(0.5)
    expect(most).toBeLessThanOrEqual(1)
    const master = out.find((g) => g.value === VOICES.woof.volume * CEILING)
    expect(master).toBeDefined()
  })

  it('starts every source it makes, and stops each once the voice is over', () => {
    const { ctx, player } = fake()
    player.play(VOICES.woofWoof)
    const sources = ctx.sources()
    expect(sources.length).toBeGreaterThan(0)
    for (const s of sources) {
      expect(s.started).not.toBeNull()
      expect(s.stoppedAt.length).toBeGreaterThan(0)
    }
  })

  it('lets go of every node it made for a sound once the sound is over', () => {
    const { ctx, player } = fake()
    player.play(VOICES.meow)
    const made = ctx.nodes.filter((n) => n.kind !== 'compressor')
    endAll(ctx)
    for (const n of made) expect(n.disconnected, n.kind).toBe(true)
  })

  it('lets go of them even if the browser never says the sound ended', () => {
    vi.useFakeTimers()
    try {
      const { ctx, player } = fake()
      player.play(VOICES.purr)
      vi.advanceTimersByTime(5_000)
      for (const n of ctx.nodes.filter((n) => n.kind !== 'compressor')) expect(n.disconnected, n.kind).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cuts the sound before with a quick fade when a new one starts: rapid presses never pile up', () => {
    const { ctx, player } = fake()
    player.play(VOICES.purr)
    const first = ctx.sources()
    player.play(VOICES.meow)
    // Every source of the first sound is told to stop within a few hundredths of a second of the second press.
    for (const s of first) expect(Math.min(...s.stoppedAt)).toBeLessThanOrEqual(ctx.currentTime + 0.05)
    // Twenty presses in a row: never more than the latest sound's sources still running.
    for (let i = 0; i < 20; i++) player.play(VOICES.meow)
    const live = ctx.sources().filter((s) => Math.min(...s.stoppedAt) > ctx.currentTime + 0.05)
    expect(live.length).toBeLessThanOrEqual(ctx.sources().length / 21 + 1)
  })

  it('stop() fades out whatever is sounding', () => {
    const { ctx, player } = fake()
    player.play(VOICES.purr)
    player.stop()
    for (const s of ctx.sources()) expect(Math.min(...s.stoppedAt)).toBeLessThanOrEqual(ctx.currentTime + 0.05)
    expect(() => createPlayer(() => null).stop()).not.toThrow()
  })
})
