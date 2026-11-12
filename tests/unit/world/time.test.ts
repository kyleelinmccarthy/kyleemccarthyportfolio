import { describe, it, expect } from 'vitest'
import { bandOf, greetingFor, lookFor, themeForHour } from '@/lib/world/time'
import { greetings, welcome } from '@/content/sky'
import type { Band, Theme } from '@/content/types'

describe('bandOf', () => {
  it.each([
    [4, 'late'], [5, 'morning'], [11, 'morning'], [12, 'afternoon'], [16, 'afternoon'],
    [17, 'evening'], [21, 'evening'], [22, 'late'], [0, 'late'], [23, 'late'],
  ] as Array<[number, Band]>)('hour %i is %s', (h, b) => expect(bandOf(h)).toBe(b))

  it('wraps every small hour into the last band', () => {
    // No band starts before 05:00, so a naive scan leaves 00:00-04:59 unmatched.
    for (const hour of [0, 1, 2, 3, 4]) expect(bandOf(hour), `hour ${hour}`).toBe('late')
  })

  it('uses the hour a fractional time falls in', () => {
    expect(bandOf(5.5)).toBe('morning')
    expect(bandOf(4.99)).toBe('late')
    expect(bandOf(11.99)).toBe('morning')
    expect(bandOf(12.01)).toBe('afternoon')
    expect(bandOf(23.5)).toBe('late')
  })

  it.each([-1, 24, 99, NaN, Infinity, -Infinity])('treats %s as noon', (h) => {
    expect(bandOf(h)).toBe('afternoon')
  })
})

describe('themeForHour', () => {
  it.each([[5, 'night'], [6, 'day'], [18, 'day'], [19, 'night'], [0, 'night']] as Array<[number, Theme]>)(
    'hour %i is %s',
    (h, t) => expect(themeForHour(h)).toBe(t),
  )

  it('uses the hour a fractional time falls in', () => {
    expect(themeForHour(5.99)).toBe('night')
    expect(themeForHour(6.5)).toBe('day')
    expect(themeForHour(18.99)).toBe('day')
    expect(themeForHour(19.01)).toBe('night')
  })

  it.each([-1, 24, 99, NaN, Infinity, -Infinity])('treats %s as noon, which is day', (h) => {
    expect(themeForHour(h)).toBe('day')
  })
})

describe('lookFor', () => {
  it('picks the sky for a theme and band', () => {
    expect(lookFor('night', 'morning')).toBe('night')
    expect(lookFor('day', 'late')).toBe('afternoon')
    expect(lookFor('day', 'evening')).toBe('evening')
    expect(lookFor('day', 'morning')).toBe('morning')
    expect(lookFor('day', 'afternoon')).toBe('afternoon')
  })

  it('is night in every band after dark', () => {
    for (const band of ['morning', 'afternoon', 'evening', 'late'] as Band[]) {
      expect(lookFor('night', band), band).toBe('night')
    }
  })
})

describe('greetingFor', () => {
  it('greets by the hour', () => {
    expect(greetingFor(9)).toBe('Morning.')
    expect(greetingFor(14)).toBe('Afternoon.')
    expect(greetingFor(18)).toBe('Evening.')
    expect(greetingFor(23)).toBe('Up late? So am I.')
    expect(greetingFor(3)).toBe('Up late? So am I.')
  })

  it('greets at every band boundary', () => {
    expect(greetingFor(5)).toMatch(/morning/i)
    expect(greetingFor(11)).toMatch(/morning/i)
    expect(greetingFor(12)).toMatch(/afternoon/i)
    expect(greetingFor(16)).toMatch(/afternoon/i)
    expect(greetingFor(17)).toMatch(/evening/i)
    expect(greetingFor(21)).toMatch(/evening/i)
    expect(greetingFor(22)).toMatch(/up late/i)
  })

  it('wraps the small hours into the late-night greeting', () => {
    for (const hour of [0, 1, 2, 3, 4]) {
      expect(greetingFor(hour), `hour ${hour}`).toMatch(/up late/i)
    }
  })

  it('returns a real greeting for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingFor(hour).trim().length, `hour ${hour}`).toBeGreaterThan(0)
    }
  })

  it('never returns a neutral welcome as a time-of-day greeting', () => {
    // The plain welcome is the no-JS and pre-hydration text. If a band matched
    // it, the client swap would be a no-op and nobody would notice.
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingFor(hour)).not.toBe(welcome)
    }
  })

  it('uses the greetings content for every band', () => {
    expect(greetings.map((g) => greetingFor(g.from))).toEqual(greetings.map((g) => g.text))
  })

  it.each([-1, 24, 99, NaN, Infinity])('treats %s as noon', (h) => {
    expect(greetingFor(h)).toBe('Afternoon.')
  })
})

describe('survives hours it should never be given', () => {
  it('always returns a valid theme and a full-stop greeting', () => {
    for (const h of [-1, 24, 99, NaN]) {
      expect(['day', 'night']).toContain(themeForHour(h))
      expect(greetingFor(h)).toMatch(/\.$/)
    }
  })
})
