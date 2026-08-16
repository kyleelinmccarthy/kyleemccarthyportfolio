import { describe, it, expect } from 'vitest'
import { groupArt } from '@/lib/artGroups'
import { artAlt } from '@/content/room'

describe('groupArt', () => {
  it('groups by the medium prefix in the required render order', () => {
    const groups = groupArt(artAlt)
    expect(groups.map((g) => g.label)).toEqual([
      'Digital',
      'Stickers',
      'Acrylic pours',
      'Watercolour',
      'Sketches',
      'Fan art & other',
    ])
  })

  it('puts every slug in exactly one group', () => {
    const groups = groupArt(artAlt)
    const seen = new Map<string, number>()
    for (const group of groups) {
      for (const item of group.items) {
        seen.set(item.slug, (seen.get(item.slug) ?? 0) + 1)
      }
    }
    for (const slug of Object.keys(artAlt)) {
      expect(seen.get(slug), `${slug} should appear once`).toBe(1)
    }
    const totalGrouped = groups.reduce((n, g) => n + g.items.length, 0)
    expect(totalGrouped).toBe(Object.keys(artAlt).length)
  })

  it('is case-insensitive and matches the longest prefix first', () => {
    const groups = groupArt({
      stickerwhatever: 'a sticker',
      sketchbook: 'a sketch',
      // "sketchfb" starts with "sketch" (6 chars) which is longer than any
      // single-letter rule, so it must land in Sketches, not be swallowed by
      // a shorter generic rule.
      sketchfb: 'a sketchfb image',
      WIMG001: 'a watercolour piece, uppercase prefix',
      unrecognized: 'falls through to the catch-all',
    })
    const byLabel = new Map(groups.map((g) => [g.label, g.items.map((i) => i.slug)]))
    expect(byLabel.get('Stickers')).toEqual(['stickerwhatever'])
    expect(byLabel.get('Sketches')).toEqual(['sketchbook', 'sketchfb'])
    expect(byLabel.get('Watercolour')).toEqual(['WIMG001'])
    expect(byLabel.get('Fan art & other')).toEqual(['unrecognized'])
  })

  it('groups the real art map sensibly: known fandom and unmatched slugs land in the catch-all', () => {
    const groups = groupArt(artAlt)
    const byLabel = new Map(groups.map((g) => [g.label, g.items.map((i) => i.slug)]))
    expect(byLabel.get('Fan art & other')).toEqual(
      expect.arrayContaining(['arcanevi', 'jjkgojo', 'mhadeku', 'kaneki'])
    )
    expect(byLabel.get('Digital')?.every((slug) => slug.toLowerCase().startsWith('digital'))).toBe(true)
    expect(byLabel.get('Watercolour')?.every((slug) => slug.toLowerCase().startsWith('w'))).toBe(true)
  })
})
