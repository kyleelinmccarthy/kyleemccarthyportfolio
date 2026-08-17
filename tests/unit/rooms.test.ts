import { describe, it, expect } from 'vitest'
import { caseStudies, FEATURED } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'

describe('featured work', () => {
  it('is Kylee’s seven, four professional and three personal', () => {
    expect(FEATURED).toEqual([
      'beacon', '403hq', 'aura', 'nbs-website',
      'kingdoms-and-crowns', 'chemtree-hq', 'wretched-few',
    ])
    const byslug = new Map(projects.map((p) => [p.slug, p]))
    const pro = FEATURED.filter((s) => byslug.get(s)?.isPersonal === false)
    expect(pro).toHaveLength(4)
    expect(FEATURED.length - pro.length).toBe(3)
  })

  it('has a case study for every featured slug and no orphans', () => {
    expect(caseStudies.map((c) => c.slug).sort()).toEqual([...FEATURED].sort())
    for (const c of caseStudies) {
      expect(projects.some((p) => p.slug === c.slug), `${c.slug} is not a project`).toBe(true)
    }
  })

  it('admits something that did not work on every single piece', () => {
    // The spec's whole argument: a gallery where nothing failed is a brochure.
    for (const c of caseStudies) {
      expect(c.placard.threwAway.length, `${c.slug} threwAway`).toBeGreaterThan(20)
      expect(c.placard.differently.length, `${c.slug} differently`).toBeGreaterThan(20)
    }
  })

  it('says why it was built that way, not just what it is', () => {
    for (const c of caseStudies) {
      expect(c.whyBuiltThisWay.length, `${c.slug} whyBuiltThisWay`).toBeGreaterThan(40)
    }
  })
})

describe('room copy', () => {
  it('keeps statistics out of the building', () => {
    // Figures live on /about. A room that quotes a delivery
    // number has slipped back into being a résumé.
    const prose = [
      rooms.steps.welcome,
      rooms.window.entry, ...rooms.window.principles.flatMap((p) => [p.title, p.body]),
      rooms.floor.lede, rooms.desk.lede, rooms.wayOut.body,
    ].join(' ')
    expect(prose).not.toMatch(/\d+\s*(%|\+|x|×)/i)
    expect(prose).not.toMatch(/\b\d{3,}\b/)
  })

  it('has three principles in the window', () => {
    expect(rooms.window.principles).toHaveLength(3)
  })
})
