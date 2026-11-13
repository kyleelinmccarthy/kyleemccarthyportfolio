import { describe, it, expect } from 'vitest'
import { districtFromSearch, districtHref, placeHref, placeIdFromPath, visitHref } from '@/lib/world/route'
import { districts, places } from '@/content/world'

describe('place URLs', () => {
  it('reads and writes place URLs', () => {
    expect(placeHref('beacon')).toBe('/places/beacon')
    expect(placeIdFromPath('/places/beacon')).toBe('beacon')
    expect(placeIdFromPath('/places/beacon/')).toBe('beacon')
    expect(placeIdFromPath('/')).toBeNull()
    expect(placeIdFromPath('/places/not-a-place')).toBeNull()
  })

  it('round-trips every place', () => {
    for (const p of places) expect(placeIdFromPath(placeHref(p.id)), p.id).toBe(p.id)
  })

  it('ignores paths that only look like a place', () => {
    expect(placeIdFromPath('/places')).toBeNull()
    expect(placeIdFromPath('/places/')).toBeNull()
    expect(placeIdFromPath('/places/beacon/more')).toBeNull()
    expect(placeIdFromPath('/elsewhere/beacon')).toBeNull()
    expect(placeIdFromPath('places/beacon')).toBeNull()
  })
})

describe('district links', () => {
  it('reads and writes district links', () => {
    expect(districtHref('frenzy')).toBe('/?district=frenzy')
    expect(districtFromSearch('?district=frenzy')).toBe('frenzy')
    expect(districtFromSearch('?district=nope')).toBeNull()
    expect(districtFromSearch('')).toBeNull()
  })

  it('accepts a search string with or without the question mark', () => {
    expect(districtFromSearch('district=hours')).toBe('hours')
    expect(districtFromSearch('?other=1&district=studio')).toBe('studio')
    expect(districtFromSearch('?other=1')).toBeNull()
  })

  it('round-trips every district', () => {
    for (const d of districts) expect(districtFromSearch(districtHref(d.id).slice(1)), d.id).toBe(d.id)
  })
})

describe('pressing a landmark', () => {
  it('goes to its place, unless the visitor is already there: then nothing happens (no new history entry, no flight)', () => {
    expect(visitHref('beacon', null)).toBe('/places/beacon')
    expect(visitHref('beacon', 'aura')).toBe('/places/beacon')
    expect(visitHref('beacon', 'beacon')).toBeNull()
  })
})
