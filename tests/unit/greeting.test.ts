import { describe, it, expect } from 'vitest'
import { greetingForHour } from '@/components/rooms/greeting'
import { rooms } from '@/content/rooms'

describe('greetingForHour', () => {
  it('greets by the visitor’s local time of day', () => {
    expect(greetingForHour(5)).toMatch(/morning/i)
    expect(greetingForHour(11)).toMatch(/morning/i)
    expect(greetingForHour(12)).toMatch(/afternoon/i)
    expect(greetingForHour(16)).toMatch(/afternoon/i)
    expect(greetingForHour(17)).toMatch(/evening/i)
    expect(greetingForHour(21)).toMatch(/evening/i)
    expect(greetingForHour(22)).toMatch(/up late/i)
  })

  it('wraps the small hours into the late-night greeting', () => {
    // The bug this guards: no band starts before 05:00, so a naive scan leaves
    // 00:00–04:59 with no match at all.
    for (const hour of [0, 1, 2, 3, 4]) {
      expect(greetingForHour(hour), `hour ${hour}`).toMatch(/up late/i)
    }
  })

  it('returns a real greeting for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingForHour(hour).trim().length, `hour ${hour}`).toBeGreaterThan(0)
    }
  })

  it('never renders the neutral server greeting as a time-of-day one', () => {
    // The plain welcome is the no-JS and pre-hydration text. If a band matched
    // it, the client swap would be a no-op and nobody would notice.
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingForHour(hour)).not.toBe(rooms.steps.welcome)
    }
  })
})
