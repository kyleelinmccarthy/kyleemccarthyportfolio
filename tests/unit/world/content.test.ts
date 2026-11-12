import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { jpegSize } from './jpeg'
import { projects } from '@/content/projects'
import { districts, places, tourOrder, placeById } from '@/content/world'
import { looks, greetings, constellations, welcome, dayHours } from '@/content/sky'
import { onTheGo } from '@/content/onTheGo'

describe('world content', () => {
  it('has five districts and nineteen places', () => {
    expect(districts.map((d) => d.id)).toEqual(['works', 'frenzy', 'hours', 'studio', 'home'])
    const count = (id: string) => places.filter((p) => p.district === id).length
    expect([count('works'), count('frenzy'), count('hours'), count('studio'), count('home')]).toEqual([6, 4, 3, 2, 4])
    expect(places).toHaveLength(19)
  })
  it('gives every place a unique, URL-safe id', () => {
    const ids = places.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
  it('points every project place and collection item at a real project', () => {
    const slugs = new Set(projects.map((p) => p.slug))
    for (const p of places) {
      if (p.content.kind === 'project') expect(slugs.has(p.content.slug), p.id).toBe(true)
      if (p.content.kind === 'collection') for (const i of p.content.items) if ('project' in i) expect(slugs.has(i.project)).toBe(true)
    }
  })
  it('shows every project exactly once', () => {
    const shown = places.flatMap((p) => p.content.kind === 'project' ? [p.content.slug]
      : p.content.kind === 'collection' ? p.content.items.flatMap((i) => 'project' in i ? [i.project] : []) : [])
    expect([...shown].sort()).toEqual(projects.map((p) => p.slug).sort())
  })
  it('tours every place exactly once, district by district in the numbered order, starting at home', () => {
    expect([...tourOrder].sort()).toEqual(places.map((p) => p.id).sort())
    expect(tourOrder[0]).toBe('home'); expect(tourOrder[1]).toBe('three-things'); expect(tourOrder.at(-1)).toBe('tattoo-designs')
    const run = tourOrder.map((id) => placeById(id)!.district).filter((d, i, all) => d !== all[i - 1])
    expect(run).toEqual(['home', 'works', 'hours', 'frenzy', 'studio'])
  })
  it('gives every poster a file on disk and its size in pixels, as the file stores them', () => {
    const withPosters = places.filter((p) => p.poster)
    expect(withPosters.length).toBeGreaterThan(0)
    for (const p of places) expect(Boolean(p.posterSize), `${p.id}: a size only with a poster`).toBe(Boolean(p.poster))
    for (const p of withPosters) {
      const file = resolve(__dirname, '../../../public', `.${p.poster}`)
      expect(existsSync(file), p.id).toBe(true)
      expect(p.posterSize, p.id).toEqual(jpegSize(file))
    }
  })
  it('looks places up by id', () => {
    expect(placeById('beacon')?.model).toBe('lighthouse')
    expect(placeById('nowhere')).toBeUndefined()
  })
  it('keeps the on-the-go list to exactly three', () => {
    expect(onTheGo).toEqual([{ project: 'paragon' }, { project: 'onboarding' },
      { name: 'Tech Processes', summary: 'CI/CD automation, SDLC SOPs, automations, KPI management, dashboard automation and more.' }])
  })
  it('keeps the four greetings and their hours', () => {
    expect(greetings).toEqual([{ from: 5, text: 'Morning.' }, { from: 12, text: 'Afternoon.' }, { from: 17, text: 'Evening.' }, { from: 22, text: 'Up late? So am I.' }])
  })
  it('keeps the welcome line and the day hours', () => {
    expect(welcome).toBe('Come have a look around.')
    expect(dayHours).toEqual({ from: 6, to: 19 })
  })
  it('defines a full look for each time of day', () => {
    const keys = Object.keys(looks.afternoon).sort()
    for (const k of ['morning', 'afternoon', 'evening', 'night'] as const) expect(Object.keys(looks[k]).sort()).toEqual(keys)
  })
  it('has the four constellations, each with in-range lines', () => {
    expect(constellations.map((c) => c.name)).toEqual(['The Crown', 'Jimothy Major', 'The Natural 20', 'The Pencil'])
    for (const c of constellations) for (const [a, b] of c.lines) {
      expect(a).toBeLessThan(c.points.length)
      expect(b).toBeLessThan(c.points.length)
    }
  })
})
