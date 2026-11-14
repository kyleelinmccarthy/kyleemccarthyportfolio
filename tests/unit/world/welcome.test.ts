import { describe, it, expect } from 'vitest'
import { guideSays, isGreeting, type GuideInput } from '@/lib/world/guide'
import { GUEST_WAVE_PHASE, WELCOME_NO_ROOM, WELCOME_TIMING, greetingOpen, welcomeShows, welcomeStage } from '@/lib/world/welcome'

const base: GuideInput = { route: { kind: 'overview' }, firstArrival: true, theme: 'day', hintsOn: true, previous: null }
const greeting = guideSays(base)

describe('when the welcome pair shows', () => {
  it('shows while the greeting is open, by day or by night, over the planet or a district', () => {
    expect(welcomeShows({ says: greeting, open: true })).toBe(true)
    expect(welcomeShows({ says: guideSays({ ...base, theme: 'night' }), open: true })).toBe(true)
    expect(welcomeShows({ says: guideSays({ ...base, route: { kind: 'district', id: 'works' } }), open: true })).toBe(true)
  })

  it('goes once the greeting is closed or folded to its chip', () => {
    expect(welcomeShows({ says: greeting, open: false })).toBe(false)
  })

  it('never shows for any other line: an idle line, a place’s line (even her hello), or nothing at all', () => {
    expect(welcomeShows({ says: guideSays({ ...base, firstArrival: false }), open: true })).toBe(false)
    expect(welcomeShows({ says: guideSays({ ...base, route: { kind: 'place', id: 'beacon' } }), open: true })).toBe(false)
    expect(welcomeShows({ says: guideSays({ ...base, hintsOn: false }), open: true })).toBe(false)
    expect(welcomeShows({ says: null, open: true })).toBe(false)
  })

  it('does not show on a screen with no room for it, though her greeting is still open there', () => {
    expect(welcomeShows({ says: greeting, open: true, room: false })).toBe(false)
    expect(greetingOpen({ says: greeting, open: true })).toBe(true)
    expect(welcomeShows({ says: greeting, open: true, room: true })).toBe(true)
    expect(greetingOpen({ says: greeting, open: false })).toBe(false)
    expect(greetingOpen({ says: guideSays({ ...base, firstArrival: false }), open: true })).toBe(false)
  })

  it('names the screens with no room as a media query: short phones, and the narrowest', () => {
    expect(WELCOME_NO_ROOM).toContain('max-height')
    expect(WELCOME_NO_ROOM).toContain('max-width')
  })

  it('knows the greeting by its key, whatever the theme', () => {
    expect(isGreeting(greeting)).toBe(true)
    expect(isGreeting(guideSays({ ...base, theme: 'night' }))).toBe(true)
    expect(isGreeting(guideSays({ ...base, firstArrival: false }))).toBe(false)
    expect(isGreeting(null)).toBe(false)
  })
})

describe('the welcome pair’s stage', () => {
  it('pops in when it shows, shrinks away when it goes, and is gone once it has', () => {
    expect(welcomeStage(true, 'gone')).toBe('in')
    expect(welcomeStage(true, 'out')).toBe('in')
    expect(welcomeStage(false, 'in')).toBe('out')
    expect(welcomeStage(false, 'out')).toBe('out')
    expect(welcomeStage(false, 'gone')).toBe('gone')
  })

  it('under reduced motion simply appears and goes, with nothing to shrink', () => {
    expect(welcomeStage(true, 'gone', true)).toBe('in')
    expect(welcomeStage(false, 'in', true)).toBe('gone')
  })

  it('has named timings, the pop after a short pause and the shrink quicker than the pop', () => {
    expect(WELCOME_TIMING.delayMs).toBeGreaterThan(0)
    expect(WELCOME_TIMING.outMs).toBeLessThan(WELCOME_TIMING.inMs)
  })

  it('sets the visitor’s wave apart from the guide’s, so they never wave in unison', () => {
    expect(Math.abs(Math.sin(GUEST_WAVE_PHASE))).toBeGreaterThan(0.5)
  })
})
