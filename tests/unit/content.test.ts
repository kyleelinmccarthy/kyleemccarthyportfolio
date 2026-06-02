import { describe, it, expect } from 'vitest'
import { projects } from '@/content/projects'
import { journey } from '@/content/journey'
import { inquiryOptions, inquiryLabel } from '@/content/contactOptions'

describe('projects content', () => {
  it('has the expected 12 projects (6 work + 6 personal)', () => {
    expect(projects).toHaveLength(12)
    expect(projects.filter((p) => p.isPersonal)).toHaveLength(6)
    expect(projects.filter((p) => !p.isPersonal)).toHaveLength(6)
  })

  it('has unique slugs', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('only declares a screenshot when there is a live URL to capture from', () => {
    for (const p of projects) {
      if (p.screenshot) expect(p.liveUrl, `${p.slug} has a screenshot but no liveUrl`).toBeTruthy()
    }
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

describe('journey figures', () => {
  it('carries the apps-built-in-2026 claim, counting every project', () => {
    const appsFigure = journey.build.figures.find((f) =>
      f.label.toLowerCase().includes('production apps')
    )
    expect(appsFigure).toBeTruthy()
    expect(appsFigure!.label.toLowerCase()).toContain('2026')
    // BuildScene derives the displayed value from projects.length; keep the
    // content fallback in sync so it never reads as stale on its own.
    expect(appsFigure!.value).toBe(String(projects.length))
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

describe('inquiry options', () => {
  it('round-trips value -> label', () => {
    expect(inquiryLabel('advisory')).toBe('Advisory engagement')
    expect(inquiryLabel('nope')).toBe('Inquiry')
  })

  it('has five distinct options (no fractional/interim leadership)', () => {
    expect(inquiryOptions).toHaveLength(5)
    expect(new Set(inquiryOptions.map((o) => o.value)).size).toBe(5)
    expect(inquiryOptions.map((o) => o.value)).not.toContain('fractional')
  })
})
