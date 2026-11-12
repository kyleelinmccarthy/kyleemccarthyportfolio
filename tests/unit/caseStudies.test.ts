import { describe, it, expect } from 'vitest'
import { caseStudies } from '@/content/caseStudies'

describe('case studies', () => {
  it('admits something that did not work wherever there is a placard', () => {
    // The spec's whole argument: a portfolio where nothing failed is a brochure.
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
