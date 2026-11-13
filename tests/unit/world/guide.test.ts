import { describe, it, expect } from 'vitest'
import { guide } from '@/content/guide'
import { places, tourOrder } from '@/content/world'
import { WAVE_SECONDS, announcedAs, guideSays, isWaving, shouldAnnounce, spoken, type GuideInput } from '@/lib/world/guide'
import { tourStep } from '@/lib/world/tour'

const base: GuideInput = { route: { kind: 'overview' }, firstArrival: false, theme: 'day', hintsOn: true, previous: null }
const at = (id: string, more: Partial<GuideInput> = {}) => guideSays({ ...base, route: { kind: 'place', id }, ...more })

describe('what the guide says over the planet', () => {
  it('greets a visitor on their first arrival, by day or by night, offering the tour or a look round alone, in the HUD', () => {
    for (const theme of ['day', 'night'] as const) {
      const says = guideSays({ ...base, firstArrival: true, theme })!
      expect(says.line.text).toBe(guide.greeting[theme])
      expect(says.anchor).toBe('hud')
      expect(says.actions.map((a) => a.kind)).toEqual(['start', 'alone'])
      expect(says.actions[0]).toMatchObject({ label: guide.tour.start, href: `/places/${tourOrder[0]}`, detail: 'Home' })
      expect(says.actions[1]!.href).toBeUndefined()
    }
  })

  it('greets the same way over a district', () => {
    const says = guideSays({ ...base, route: { kind: 'district', id: 'works' }, firstArrival: true })!
    expect(says.line.text).toBe(guide.greeting.day)
    expect(says.anchor).toBe('hud')
  })

  it('says an idle line once she has greeted them, the lines taking turns so coming back never repeats the last', () => {
    const first = guideSays(base)!
    expect(first.line.text).toBe(guide.idle[0])
    expect(first.actions).toEqual([])
    expect(first.anchor).toBe('hud')
    const second = guideSays({ ...base, previous: first.key })!
    expect(second.line.text).toBe(guide.idle[1])
    const third = guideSays({ ...base, previous: second.key })!
    expect(third.line.text).toBe(guide.idle[0])
    // Coming from a place, or from the greeting, starts at the first.
    expect(guideSays({ ...base, previous: 'place:beacon' })!.line.text).toBe(guide.idle[0])
    expect(guideSays({ ...base, previous: 'greeting:day' })!.line.text).toBe(guide.idle[0])
  })

  it('treats a previous key it does not understand as no previous line', () => {
    for (const previous of ['idle:', 'idle:x', 'idle:-1', 'idle:1.5', 'idle:99']) {
      const says = guideSays({ ...base, previous })!
      expect(guide.idle).toContain(says.line.text)
    }
    expect(guideSays({ ...base, previous: 'idle:x' })!.line.text).toBe(guide.idle[0])
  })
})

describe('what the guide says at a place', () => {
  it('says each place’s own line, by her', () => {
    for (const place of places) {
      const says = at(place.id)!
      expect(says.line.text).toBe(guide.places[place.id])
      expect(says.anchor).toBe('figure')
      expect(says.line.title).toBeUndefined()
    }
  })

  it('says hello first when the visitor lands straight on a place', () => {
    const says = at('beacon', { firstArrival: true })!
    expect(says.line.title).toBe(guide.hello)
    expect(says.line.text).toBe(guide.places.beacon)
    expect(says.key).not.toBe(at('beacon')!.key)
  })

  it('offers the tour’s next and previous stops, with the same hrefs as the tour bar', () => {
    for (const [i, id] of tourOrder.entries()) {
      const actions = at(id)!.actions
      const next = actions.find((a) => a.kind === 'next')
      const back = actions.find((a) => a.kind === 'back')
      if (i > 0) expect(back).toMatchObject({ href: `/places/${tourStep(id, -1)}`, label: guide.tour.back })
      else expect(back).toBeUndefined()
      if (i < tourOrder.length - 1) expect(next).toMatchObject({ href: `/places/${tourStep(id, 1)}`, label: guide.tour.next })
      else expect(next).toBeUndefined()
    }
  })

  it('names where each link goes, for a screen reader', () => {
    const actions = at('home')!.actions
    expect(actions).toEqual([{ kind: 'next', label: guide.tour.next, href: '/places/three-things', detail: 'Three things' }])
  })

  it('at the last stop says the tour is over and offers the way back to the planet', () => {
    const last = tourOrder[tourOrder.length - 1]!
    const says = at(last)!
    expect(says.line.aside).toBe(guide.tour.last)
    expect(says.actions.map((a) => a.kind)).toEqual(['back', 'finish'])
    expect(says.actions[1]).toMatchObject({ href: '/', label: guide.tour.finish })
    // Nowhere else.
    for (const id of tourOrder.slice(0, -1)) expect(at(id)!.line.aside).toBeUndefined()
  })

  it('says nothing at a place it has no line for', () => {
    expect(at('nowhere')).toBeNull()
  })
})

describe('when the guide is quiet, and when a line is new', () => {
  it('says nothing while hints are off, anywhere', () => {
    expect(guideSays({ ...base, hintsOn: false })).toBeNull()
    expect(guideSays({ ...base, hintsOn: false, firstArrival: true })).toBeNull()
    expect(at('beacon', { hintsOn: false })).toBeNull()
  })

  it('marks a line changed only when its key differs from the last one', () => {
    const says = at('aura')!
    expect(says.changed).toBe(true)
    expect(at('aura', { previous: says.key })!.changed).toBe(false)
    expect(at('ruckus', { previous: says.key })!.changed).toBe(true)
  })

  it('takes its words from the copy it is given', () => {
    const copy = { ...guide, places: { ...guide.places, beacon: 'A test line.' } }
    expect(guideSays({ ...base, route: { kind: 'place', id: 'beacon' } }, copy)!.line.text).toBe('A test line.')
  })
})

describe('what a screen reader hears, and when', () => {
  it('hears a new line once, as plain text with her hello and the aside', () => {
    const first = at('tattoo-designs', { firstArrival: true })!
    expect(spoken(first)).toBe(`${guide.hello} ${guide.places['tattoo-designs']} ${guide.tour.last}`)
    expect(shouldAnnounce(null, first)).toBe(true)
    expect(shouldAnnounce(announcedAs(first), first)).toBe(false)
  })

  it('does not hear the greeting again when only the theme changes', () => {
    const day = guideSays({ ...base, firstArrival: true, theme: 'day' })!
    const night = guideSays({ ...base, firstArrival: true, theme: 'night' })!
    expect(day.line.text).not.toBe(night.line.text)
    expect(shouldAnnounce(announcedAs(day), night)).toBe(false)
  })

  it('hears nothing while hints are hidden, and nothing when they are hidden', () => {
    const line = at('aura')!
    const hidden = at('aura', { hintsOn: false })
    expect(spoken(hidden)).toBe('')
    expect(shouldAnnounce(announcedAs(line), hidden)).toBe(false)
    expect(shouldAnnounce(null, hidden)).toBe(false)
  })

  it('hears each new place, and an idle line after a place', () => {
    const a = at('aura')!
    const b = at('ruckus', { previous: a.key })!
    expect(shouldAnnounce(announcedAs(a), b)).toBe(true)
    const idle = guideSays({ ...base, previous: b.key })!
    expect(shouldAnnounce(announcedAs(b), idle)).toBe(true)
  })

  it('keeps the same idle line when asked again with the same line before it (a theme change does not move it on)', () => {
    const before = 'place:aura'
    expect(guideSays({ ...base, previous: before, theme: 'day' })!.line.text).toBe(guideSays({ ...base, previous: before, theme: 'night' })!.line.text)
  })
})

describe('her wave', () => {
  it('lasts WAVE_SECONDS from when it starts', () => {
    expect(isWaving(10, 10)).toBe(true)
    expect(isWaving(10 + WAVE_SECONDS - 0.01, 10)).toBe(true)
    expect(isWaving(10 + WAVE_SECONDS, 10)).toBe(false)
    expect(isWaving(9, 10)).toBe(false)
  })

  it('never waves without a start, or on a clock that is not a number', () => {
    expect(isWaving(10, null)).toBe(false)
    expect(isWaving(NaN, 10)).toBe(false)
    expect(isWaving(10, Infinity)).toBe(false)
  })
})
