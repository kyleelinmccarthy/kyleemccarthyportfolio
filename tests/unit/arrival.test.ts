import { afterEach, describe, expect, it, vi } from 'vitest'
import { districtOrder, places } from '@/content/world'
import {
  ARRIVAL,
  ARRIVAL_AT_ATTR,
  ARRIVAL_ATTR,
  ARRIVAL_SEEN_KEY,
  arrivalCssVars,
  arrivalInitScript,
  countParts,
  landmarkDelays,
  nextStageAt,
  planetScale,
  planetTurn,
  progress,
  riseAt,
  stageAt,
} from '@/lib/arrival'

describe('the arrival’s stages', () => {
  it('runs statement, build, greet, done, in that order and at the timeline’s times', () => {
    expect(stageAt(0)).toBe('statement')
    expect(stageAt(ARRIVAL.settle.at - 1)).toBe('statement')
    expect(stageAt(ARRIVAL.settle.at)).toBe('build')
    expect(stageAt(ARRIVAL.greet - 1)).toBe('build')
    expect(stageAt(ARRIVAL.greet)).toBe('greet')
    expect(stageAt(ARRIVAL.end - 1)).toBe('greet')
    expect(stageAt(ARRIVAL.end)).toBe('done')
  })

  it('counts anything that is not a time as done, so a broken clock never holds the page', () => {
    expect(stageAt(Number.NaN)).toBe('done')
    expect(stageAt(Number.POSITIVE_INFINITY)).toBe('done')
  })

  it('says when the next stage begins, and nothing once done', () => {
    expect(nextStageAt(0)).toBe(ARRIVAL.settle.at)
    expect(nextStageAt(ARRIVAL.settle.at)).toBe(ARRIVAL.greet)
    expect(nextStageAt(ARRIVAL.greet + 10)).toBe(ARRIVAL.end)
    expect(nextStageAt(ARRIVAL.end)).toBeNull()
    for (let ms = 0; ms < ARRIVAL.end; ms += 97) expect(stageAt(nextStageAt(ms)!)).not.toBe(stageAt(ms))
  })

  it('takes about four seconds, the planet coming in as the statement settles, the guide last', () => {
    expect(ARRIVAL.end).toBeGreaterThanOrEqual(3500)
    expect(ARRIVAL.end).toBeLessThanOrEqual(4500)
    expect(ARRIVAL.count.at + ARRIVAL.count.ms).toBeLessThanOrEqual(ARRIVAL.settle.at)
    expect(ARRIVAL.planet.at).toBeLessThan(ARRIVAL.settle.at + ARRIVAL.settle.ms)
    expect(ARRIVAL.greet).toBeGreaterThan(ARRIVAL.landmarks.at)
  })

  it('has every landmark risen, and the HUD in, before it ends', () => {
    const last = Math.max(...landmarkDelays(places, districtOrder).values())
    expect(last + ARRIVAL.landmarks.ms).toBeLessThanOrEqual(ARRIVAL.end)
    expect(ARRIVAL.hud.at + ARRIVAL.hud.ms).toBeLessThanOrEqual(ARRIVAL.end)
    expect(ARRIVAL.planet.at + ARRIVAL.planet.ms).toBeLessThanOrEqual(ARRIVAL.end)
  })
})

describe('progress through a span', () => {
  it('is 0 before, 1 after, and in between along the way', () => {
    const span = { at: 100, ms: 200 }
    expect(progress(span, 0)).toBe(0)
    expect(progress(span, 100)).toBe(0)
    expect(progress(span, 200)).toBe(0.5)
    expect(progress(span, 300)).toBe(1)
    expect(progress(span, Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('the planet spinning in', () => {
  it('is not drawn before its time, and ends at its own size, facing as the visitor’s view begins', () => {
    expect(planetScale(ARRIVAL.planet.at - 1)).toBe(0)
    expect(planetScale(ARRIVAL.planet.at + ARRIVAL.planet.ms)).toBeCloseTo(1, 10)
    expect(planetScale(Number.POSITIVE_INFINITY)).toBeCloseTo(1, 10)
    expect(planetTurn(ARRIVAL.planet.at + ARRIVAL.planet.ms)).toBeCloseTo(0, 10)
    expect(planetTurn(Number.POSITIVE_INFINITY)).toBeCloseTo(0, 10)
  })

  it('starts small and turned, and overshoots a little before it settles', () => {
    const start = planetScale(ARRIVAL.planet.at + 1)
    expect(start).toBeGreaterThan(0.3)
    expect(start).toBeLessThan(0.5)
    expect(planetTurn(ARRIVAL.planet.at)).toBeLessThan(-1)
    let most = 0
    for (let ms = ARRIVAL.planet.at; ms <= ARRIVAL.planet.at + ARRIVAL.planet.ms; ms += 10) most = Math.max(most, planetScale(ms))
    expect(most).toBeGreaterThan(1)
    expect(most).toBeLessThan(1.08)
  })
})

describe('the landmarks rising', () => {
  const delays = landmarkDelays(places, districtOrder)

  it('gives every place a time to rise', () => {
    expect([...delays.keys()].sort()).toEqual(places.map((p) => p.id).sort())
  })

  it('goes district by district in tour order, each district’s places one after another as listed', () => {
    const order = [...delays.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => places.find((p) => p.id === id)!.district)
    const firstOf = districtOrder.map((d) => order.indexOf(d))
    expect(firstOf).toEqual([...firstOf].sort((a, b) => a - b))
    for (const district of districtOrder) {
      const times = places.filter((p) => p.district === district).map((p) => delays.get(p.id)!)
      expect(times).toEqual([...times].sort((a, b) => a - b))
      expect(new Set(times).size).toBe(times.length)
    }
  })

  it('is not drawn before its time, springs past its size, and rests at it', () => {
    const delay = 2500
    expect(riseAt(delay - 1, delay)).toBe(0)
    expect(riseAt(delay + ARRIVAL.landmarks.ms, delay)).toBeCloseTo(1, 10)
    expect(riseAt(Number.POSITIVE_INFINITY, delay)).toBeCloseTo(1, 10)
    let most = 0
    for (let ms = delay; ms <= delay + ARRIVAL.landmarks.ms; ms += 5) most = Math.max(most, riseAt(ms, delay))
    expect(most).toBeGreaterThan(1.05)
    expect(most).toBeLessThan(1.25)
  })
})

describe('counting a figure', () => {
  it('counts its first whole number and keeps the rest as it is', () => {
    expect(countParts('200')).toEqual({ before: '', to: 200, after: '' })
    expect(countParts('11 of 14')).toEqual({ before: '', to: 11, after: ' of 14' })
    expect(countParts('15+')).toEqual({ before: '', to: 15, after: '+' })
    expect(countParts('1 → 14')).toEqual({ before: '', to: 1, after: ' → 14' })
  })

  it('does not count a value with no number in it', () => {
    expect(countParts('many')).toEqual({ before: 'many', to: null, after: '' })
  })
})

describe('the arrival’s CSS times', () => {
  it('are the timeline’s, in milliseconds', () => {
    const vars = arrivalCssVars()
    expect(vars['--arrival-settle-at']).toBe(`${ARRIVAL.settle.at}ms`)
    expect(vars['--arrival-count-ms']).toBe(`${ARRIVAL.count.ms}ms`)
    expect(vars['--arrival-hud-at']).toBe(`${ARRIVAL.hud.at}ms`)
  })
})

describe('the arrival’s init script', () => {
  const html = document.documentElement
  const run = (url: string, reduce = false) => {
    window.history.replaceState(null, '', url)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce') }))
    new Function(arrivalInitScript())()
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    html.removeAttribute(ARRIVAL_ATTR)
    html.removeAttribute(ARRIVAL_AT_ATTR)
    html.removeAttribute('style')
    window.history.replaceState(null, '', '/')
  })

  it('plays on the home page’s first load in a visit: marks <html>, the moment and the times, and remembers it', () => {
    run('/')
    expect(html.getAttribute(ARRIVAL_ATTR)).toBe('play')
    expect(Number(html.getAttribute(ARRIVAL_AT_ATTR))).toBeGreaterThanOrEqual(0)
    expect(html.style.getPropertyValue('--arrival-settle-at')).toBe(`${ARRIVAL.settle.at}ms`)
    expect(window.sessionStorage.getItem(ARRIVAL_SEEN_KEY)).toBe('1')
  })

  it('plays once a visit', () => {
    window.sessionStorage.setItem(ARRIVAL_SEEN_KEY, '1')
    run('/')
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
  })

  it('never plays on a deep link: a place, a district, the index', () => {
    for (const url of ['/places/beacon', '/?district=works', '/#index']) {
      run(url)
      expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
    }
    // Nor is the visit marked as having seen it.
    expect(window.sessionStorage.getItem(ARRIVAL_SEEN_KEY)).toBeNull()
  })

  it('never plays under reduced motion', () => {
    run('/', true)
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
  })

  it('does not play where storage is blocked, as it could not be kept to once a visit', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('blocked')
    })
    run('/')
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
    vi.restoreAllMocks()
  })
})
