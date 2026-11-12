import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'
import { projects } from '@/content/projects'
import { caseStudies } from '@/content/caseStudies'
import { build, lead } from '@/content/about'
import { artAlt, tattooAlt } from '@/content/art'

describe('projects content', () => {
  it('has 7 professional and 7 personal projects', () => {
    expect(projects.filter((p) => !p.isPersonal)).toHaveLength(7)
    expect(projects.filter((p) => p.isPersonal)).toHaveLength(7)
  })

  it('has dropped the retired projects', () => {
    const gone = [
      'wretched-few',
      'eliminated-web',
      'chemtree-games',
      'chemtree-hq',
      'doing-the-thing',
      'external-payroll',
      'forms-suite',
      'family-budgeting',
    ]
    for (const slug of gone) expect(projects.find((p) => p.slug === slug)).toBeUndefined()
  })

  it('has the new projects with their live links', () => {
    const url = (slug: string) => projects.find((p) => p.slug === slug)?.liveUrl
    expect(url('eliminated-site')).toBe('https://eliminatedgame.com/')
    expect(url('tiny-frenzy-games')).toBe('https://tinyfrenzygames.com/')
    expect(url('the-budget')).toBe('https://the-budget-demo.kyleelinmccarthy.workers.dev/login')
    expect(projects.find((p) => p.slug === 'jimothy-and-pidge')?.name).toBe(
      'Jimothy & Pidge: Shenanigans in Seattle'
    )
    expect(projects.find((p) => p.slug === 'eliminated')?.statusLabel).toBe('Coming soon to Steam')
  })

  it('only writes case studies for projects that exist', () => {
    for (const c of caseStudies) expect(projects.some((p) => p.slug === c.slug), c.slug).toBe(true)
  })

  it('keeps the stated enterprise counts internally consistent', () => {
    // The résumé's 14 = 6 production + 4 releasing + 4 building, 11 built personally.
    // The 7 professional cards consolidate (403HQ is two deployments) and do
    // not name all 14, so an exact per-bucket equality would be
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

  it('requires built copy on every project', () => {
    for (const p of projects) {
      expect(p.built.length).toBeGreaterThan(10)
    }
  })
})

/**
 * The gallery panel builds its srcs from these alt maps, so a slug with no
 * matching .jpg is a 404 on the art and tattoo places that no other test would catch.
 */
describe('gallery media', () => {
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

describe('about figures', () => {
  it('states build figures as literals, not as a count of cards on the page', () => {
    // The old BuildScene overwrote this with String(projects.length), which made
    // the headline number mean "cards on this page" — 17 after the rewrite,
    // presented as production apps for one year.
    for (const f of build.figures) {
      expect(f.value).not.toBe(String(projects.length))
      expect(f.value.length).toBeGreaterThan(0)
    }
  })

  it('splits lead vs build figures, all with non-empty labels', () => {
    const all = [...lead.figures, ...build.figures]
    expect(all.length).toBeGreaterThanOrEqual(4)
    for (const f of all) expect(f.label.length).toBeGreaterThan(0)
  })
})

describe('leadership context', () => {
  it('credits the team in the leadership context (not just Kylee)', () => {
    expect(lead.context.toLowerCase()).toContain('team')
  })
})

describe('the planet pictures', () => {
  const pictures = ['poster-day.webp', 'poster-night.webp']

  it('ships both, within the 250KB budget', () => {
    for (const f of pictures) {
      const p = resolve(process.cwd(), 'public/world', f)
      expect(existsSync(p), f).toBe(true)
      expect(statSync(p).size, f).toBeLessThan(250_000)
    }
  })

  it('are real 1600 by 1000 WebP files, not a renamed other format', async () => {
    const { default: sharp } = await import('sharp')
    for (const f of pictures) {
      const meta = await sharp(resolve(process.cwd(), 'public/world', f)).metadata()
      expect(meta.format, f).toBe('webp')
      expect([meta.width, meta.height], f).toEqual([1600, 1000])
    }
  })
})
