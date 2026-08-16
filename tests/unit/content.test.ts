import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'
import { projects } from '@/content/projects'
import { journey } from '@/content/journey'
import { artAlt, tattooAlt } from '@/content/room'

describe('projects content', () => {
  it('has 8 professional and 9 personal projects', () => {
    expect(projects.filter((p) => !p.isPersonal)).toHaveLength(8)
    expect(projects.filter((p) => p.isPersonal)).toHaveLength(9)
  })

  it('keeps the stated enterprise counts internally consistent', () => {
    // The résumé's 14 = 6 production + 4 releasing + 4 building, 11 built personally.
    // The 8 cards consolidate (403HQ is two deployments; forms-suite is three
    // services) and do not name all 14, so an exact per-bucket equality would be
    // false. Assert the arithmetic of the claim, and that no bucket overflows it.
    const STATED = { production: 6, releasing: 4, building: 4 } as const
    const TOTAL = 14
    const BUILT_PERSONALLY = 11
    expect(STATED.production + STATED.releasing + STATED.building).toBe(TOTAL)
    expect(BUILT_PERSONALLY).toBeLessThanOrEqual(TOTAL)

    const pro = projects.filter((p) => !p.isPersonal)
    for (const [status, stated] of Object.entries(STATED)) {
      const named = pro.filter((p) => p.status === status).length
      expect(named, `more ${status} cards than the stated ${stated}`).toBeLessThanOrEqual(stated)
    }
  })

  it('has unique slugs', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('only claims a capture when there is a live URL to capture from', () => {
    for (const p of projects) {
      if (p.autoCapture) {
        expect(p.liveUrl, `${p.slug} is autoCapture but has no liveUrl`).toBeTruthy()
      }
    }
  })

  it('gives every media item non-empty alt text', () => {
    for (const p of projects) {
      if (!p.media) continue
      const items = [p.media.hero, ...(p.media.gallery ?? [])]
      for (const m of items) {
        expect(m.alt.trim().length, `${p.slug}: ${m.src} has empty alt`).toBeGreaterThan(0)
      }
    }
  })

  it('points every media src at a file that actually exists', () => {
    for (const p of projects) {
      if (!p.media) continue
      const items = [p.media.hero, ...(p.media.gallery ?? [])]
      for (const m of items) {
        expect(m.src.startsWith('/media/'), `${p.slug}: ${m.src} must live under /media/`).toBe(true)
        const onDisk = resolve(process.cwd(), 'public', m.src.replace(/^\//, ''))
        expect(existsSync(onDisk), `${p.slug}: missing file ${m.src}`).toBe(true)
      }
    }
  })

  it('gives every project a status', () => {
    const valid = ['production', 'releasing', 'building', 'beta', 'concept']
    for (const p of projects) expect(valid).toContain(p.status)
  })

  it('has well-formed live URLs where present', () => {
    for (const p of projects) {
      if (p.liveUrl) expect(() => new URL(p.liveUrl!)).not.toThrow()
    }
  })

  it('requires problem + built copy on every project', () => {
    for (const p of projects) {
      expect(p.problem.length).toBeGreaterThan(10)
      expect(p.built.length).toBeGreaterThan(10)
    }
  })
})

/**
 * RoomSections builds its gallery srcs from these alt maps, so a slug with no
 * matching .jpg is a 404 on /room that no other test would catch.
 */
describe('room gallery media', () => {
  const cases: Array<[string, Record<string, string>]> = [
    ['art', artAlt],
    ['tattoo', tattooAlt],
  ]

  for (const [dir, alts] of cases) {
    it(`points every ${dir} slug at a committed .jpg`, () => {
      const onDisk = new Set(readdirSync(resolve(process.cwd(), 'public/media', dir)))
      const slugs = Object.keys(alts)
      expect(slugs.length).toBeGreaterThan(0)
      for (const slug of slugs) {
        expect(onDisk.has(`${slug}.jpg`), `/media/${dir}/${slug}.jpg is missing`).toBe(true)
      }
    })

    it(`commits nothing under media/${dir} that the page cannot serve`, () => {
      // JPEG is the only format the app requests; next/image re-encodes to
      // AVIF/WebP at request time. Committed siblings were unreachable bytes.
      const files = readdirSync(resolve(process.cwd(), 'public/media', dir))
      expect(files.filter((f) => /\.(avif|webp)$/i.test(f))).toEqual([])
    })
  }
})

describe('committed media stays within the 250KB per-file budget', () => {
  it('has no oversized image and no unreachable format anywhere under /media', () => {
    const root = resolve(process.cwd(), 'public/media')
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]
      )
    const files = walk(root)
    expect(files.length).toBeGreaterThan(0)

    const unreachable = files.filter((f) => /\.(avif|webp)$/i.test(f))
    expect(unreachable, 'AVIF/WebP siblings are never requested by the app').toEqual([])

    const MAX = 250 * 1024
    const oversized = files
      .map((f) => [f, statSync(f).size] as const)
      .filter(([, size]) => size > MAX)
      .map(([f, size]) => `${f} (${Math.round(size / 1024)}KB)`)
    expect(oversized).toEqual([])
  })
})

describe('journey figures', () => {
  it('states build figures as literals, not as a count of cards on the page', () => {
    // The old BuildScene overwrote this with String(projects.length), which made
    // the headline number mean "cards on this page" — 17 after the rewrite,
    // presented as production apps for one year.
    for (const f of journey.build.figures) {
      expect(f.value).not.toBe(String(projects.length))
      expect(f.value.length).toBeGreaterThan(0)
    }
  })

  it('splits lead vs build figures, all with non-empty labels', () => {
    const all = [...journey.lead.figures, ...journey.build.figures]
    expect(all.length).toBeGreaterThanOrEqual(4)
    for (const f of all) expect(f.label.length).toBeGreaterThan(0)
  })
})

describe('journey scenes', () => {
  it('has four numbered value items in order', () => {
    expect(journey.value.items.map((i) => i.number)).toEqual(['01', '02', '03', '04'])
  })

  it('credits the team in the leadership context (not just Kylee)', () => {
    expect(journey.lead.context.toLowerCase()).toContain('team')
  })
})
