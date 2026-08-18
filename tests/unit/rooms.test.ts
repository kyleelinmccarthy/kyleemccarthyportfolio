import { describe, it, expect } from 'vitest'
import { caseStudies, FEATURED } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'

describe('featured work', () => {
  it('hangs the professional work, and only that', () => {
    // The three personal pieces used to hang here as well as standing on
    // their own shelf in the library, so each of them was shown twice. The
    // gallery points at the library instead.
    const byslug = new Map(projects.map((p) => [p.slug, p]))
    expect(FEATURED.length).toBeGreaterThan(0)
    for (const slug of FEATURED) {
      expect(byslug.get(slug)?.isPersonal, `${slug} is personal`).toBe(false)
    }
  })

  it('has a case study for every featured slug', () => {
    // Not the reverse: a case study may outlive its time on the wall, and
    // deleting Kylee's interview answers to satisfy a test would be the wrong
    // way round.
    const slugs = new Set(caseStudies.map((c) => c.slug))
    for (const slug of FEATURED) expect(slugs.has(slug), `${slug} has no case study`).toBe(true)
    for (const c of caseStudies) {
      expect(projects.some((p) => p.slug === c.slug), `${c.slug} is not a project`).toBe(true)
    }
  })

  it('admits something that did not work wherever there is a placard', () => {
    // The spec's whole argument: a gallery where nothing failed is a brochure.
    // A piece with no placard has no interview answers behind it yet — the
    // rule is that a placard is never half-written, not that every piece has
    // one, because the alternative is inventing her answers for her.
    const withPlacards = caseStudies.filter((c) => c.placard)
    expect(withPlacards.length).toBeGreaterThan(0)
    for (const c of withPlacards) {
      expect(c.placard!.threwAway.length, `${c.slug} threwAway`).toBeGreaterThan(20)
      expect(c.placard!.differently.length, `${c.slug} differently`).toBeGreaterThan(20)
      expect(c.placard!.hard.length, `${c.slug} hard`).toBeGreaterThan(20)
      expect(c.placard!.builtFor.length, `${c.slug} builtFor`).toBeGreaterThan(0)
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
      rooms.landing.entry, ...rooms.landing.principles.flatMap((p) => [p.title, p.body]),
      rooms.floor.label, rooms.desk.lede, ...rooms.wayOut.body,
    ].join(' ')
    expect(prose).not.toMatch(/\d+\s*(%|\+|x|×)/i)
    expect(prose).not.toMatch(/\b\d{3,}\b/)
  })

  it('has three principles in the window', () => {
    expect(rooms.landing.principles).toHaveLength(3)
  })
})
