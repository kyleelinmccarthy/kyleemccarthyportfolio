import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import { lead } from '@/content/about'
import { profileCopy, profileSections, skills, summary } from '@/content/profile'
import { site } from '@/content/site'
import { education, employer, milestones } from '@/content/timeline'
import { contactLinks, displayUrl, EXTERNAL_LINK, newestFirst, profileSection, profileSectionFromPath, roleDates } from '@/lib/profile'
import { profileMetadata } from '@/lib/profileMetadata'
import { personJsonLd } from '@/lib/structuredData'

const MONTH_YEAR = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/
const filled = (text: string) => text.trim().length > 0

describe('the work history', () => {
  it('gives every role a start, an end unless it is the one she holds now, a title, a line and what she did', () => {
    expect(milestones).toHaveLength(5)
    milestones.forEach((role, i) => {
      expect(role.from, role.title).toMatch(MONTH_YEAR)
      if (i < milestones.length - 1) expect(role.to, role.title).toMatch(MONTH_YEAR)
      expect(filled(role.title)).toBe(true)
      expect(filled(role.detail)).toBe(true)
      expect(role.points.length, role.title).toBeGreaterThan(0)
      for (const point of role.points) expect(filled(point), role.title).toBe(true)
    })
    // Only the last, her role now, is open-ended.
    expect(milestones.at(-1)!.to).toBeUndefined()
    expect(milestones.at(-1)!.title).toBe(site.jobTitle)
  })

  it('runs oldest first with no gaps: each role ends the month the next begins', () => {
    for (let i = 1; i < milestones.length; i++) expect(milestones[i - 1]!.to).toBe(milestones[i]!.from)
  })

  it('names the company and her years there, as the résumé heads them', () => {
    expect(employer.name).toBe('National Benefit Services, LLC')
    expect(employer.tenure).toBe('9 years in technology, 11 with the company')
  })

  it('reads a role’s dates as the résumé writes them', () => {
    expect(roleDates({ from: 'Nov 2019', to: 'Nov 2022' })).toBe('Nov 2019 – Nov 2022')
    expect(roleDates({ from: 'Nov 2022' })).toBe(`Nov 2022 – ${profileCopy.present}`)
  })

  it('puts the role she holds now first, without reordering the data', () => {
    const newest = newestFirst(milestones)
    expect(newest[0]!.title).toBe('Director of Technology Operations')
    expect(newest.at(-1)!.title).toBe('Benefits Specialist')
    expect(milestones[0]!.title).toBe('Benefits Specialist')
  })
})

describe('the about section’s facts', () => {
  it('has both degrees, with school and year', () => {
    expect(education.map((d) => `${d.degree}, ${d.school}, ${d.year}`)).toEqual([
      'M.S. Technology Management, Western Governors University, 2022',
      'B.S. Marketing Management, Western Governors University, 2020',
    ])
  })

  it('groups the skills as the résumé does, none empty', () => {
    expect(skills.map((g) => g.group)).toEqual(['Leadership', 'Engineering', 'Databases', 'Azure and infrastructure', 'AI', 'Design'])
    for (const group of skills) {
      expect(group.items.length, group.group).toBeGreaterThan(0)
      for (const item of group.items) expect(filled(item), group.group).toBe(true)
      expect(new Set(group.items).size, group.group).toBe(group.items.length)
    }
  })

  it('has the summary and three proof figures', () => {
    expect(summary).toMatch(/^I taught myself to code by automating my own job/)
    expect(lead.figures).toHaveLength(3)
  })
})

describe('the ways to reach her', () => {
  const links = contactLinks(site)

  it('are email, LinkedIn, GitHub and the résumé, each with a safe address', () => {
    expect(links.map((l) => l.id)).toEqual(['email', 'linkedin', 'github', 'resume'])
    for (const link of links) {
      expect(filled(link.label) && filled(link.text)).toBe(true)
      expect(link.href).toMatch(link.external ? /^https:\/\// : /^(mailto:|\/)/)
    }
    expect(links[0]!.href).toBe(`mailto:${site.email}`)
    expect(links[0]!.text).toBe(site.email)
    expect(site.github).toBe('https://github.com/kyleelinmccarthy')
    expect(links.find((l) => l.id === 'resume')).toMatchObject({ href: site.resumePath, download: true, external: false })
  })

  it('opens another site in a new tab, with no way back into this page', () => {
    expect(EXTERNAL_LINK).toEqual({ target: '_blank', rel: 'noopener noreferrer' })
    expect(links.filter((l) => l.external).map((l) => l.id)).toEqual(['linkedin', 'github'])
  })

  it('shows a web address as people say it', () => {
    expect(displayUrl('https://www.linkedin.com/in/someone/')).toBe('linkedin.com/in/someone')
    expect(displayUrl('https://github.com/kyleelinmccarthy')).toBe('github.com/kyleelinmccarthy')
  })

  it('are named in the structured data', () => {
    const person = personJsonLd()
    expect(person.sameAs).toEqual([site.linkedin, site.github])
    expect(person.alumniOf).toEqual([{ '@type': 'CollegeOrUniversity', name: 'Western Governors University' }])
  })
})

describe('the profile’s sections', () => {
  it('are About, Experience and Contact, each at its own address, with its words filled in', () => {
    expect(profileSections.map((s) => [s.id, s.href])).toEqual([
      ['about', '/about'],
      ['experience', '/experience'],
      ['contact', '/contact'],
    ])
    for (const s of profileSections) for (const text of [s.label, s.title, s.description]) expect(filled(text), s.id).toBe(true)
    expect(profileSection('experience').label).toBe('Experience')
  })

  it('knows which section a path opens, and that no other page opens one', () => {
    expect(profileSectionFromPath('/about')).toBe('about')
    expect(profileSectionFromPath('/experience/')).toBe('experience')
    expect(profileSectionFromPath('/contact')).toBe('contact')
    for (const other of ['/', '/places/home', '/about/more', '/abouts', '', null, undefined]) expect(profileSectionFromPath(other)).toBeNull()
  })

  it('gives each page its title, description and own address', () => {
    for (const s of profileSections) {
      const meta = profileMetadata(s.id)
      expect(meta.title).toBe(s.label)
      expect(meta.description).toBe(s.description)
      expect(meta.alternates?.canonical).toBe(s.href)
    }
  })

  it('are in the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url)
    for (const s of profileSections) expect(urls).toContain(`${site.url}${s.href}`)
  })
})
