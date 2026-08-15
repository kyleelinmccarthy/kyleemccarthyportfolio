import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectDetails } from '@/components/ProjectDetails'
import { RoomSections } from '@/components/room/RoomSections'
import { projects } from '@/content/projects'

/**
 * Spec §4 splits the roster: /work carries the 8 professional builds, /room
 * carries the 9 personal ones. ProjectDetails used to map the unfiltered list,
 * so all 17 rendered on /work and the 9 personal cards appeared on both pages.
 * These pin the rendered counts, not just the data.
 */
describe('project rosters are split between /work and /room', () => {
  it('renders only the 8 professional projects on /work', () => {
    const { container } = render(<ProjectDetails />)
    const cards = container.querySelectorAll('article')
    expect(cards).toHaveLength(8)

    for (const p of projects.filter((x) => x.isPersonal)) {
      expect(
        screen.queryByRole('heading', { name: p.name, level: 3 }),
        `${p.slug} is personal and must not appear on /work`
      ).toBeNull()
    }
  })

  it('renders only the 9 personal projects in the room', () => {
    const { container } = render(<RoomSections />)
    const cards = container.querySelectorAll('article')
    expect(cards).toHaveLength(9)

    for (const p of projects.filter((x) => !x.isPersonal)) {
      expect(
        screen.queryByRole('heading', { name: p.name, level: 3 }),
        `${p.slug} is professional and must not appear in the room`
      ).toBeNull()
    }
  })

  it('shows no project on both pages', () => {
    const work = render(<ProjectDetails />).container
    const names = (root: ParentNode) =>
      Array.from(root.querySelectorAll('article h3')).map((h) => h.textContent)
    const workNames = names(work)
    const roomNames = names(render(<RoomSections />).container)
    expect(workNames.filter((n) => roomNames.includes(n))).toEqual([])
  })
})

describe('stack chips', () => {
  it('renders the résumé tech chips on a professional card', () => {
    const { container } = render(<ProjectDetails />)
    const hq = projects.find((p) => p.slug === '403hq')!
    const chipText = Array.from(container.querySelectorAll('li')).map((li) => li.textContent)
    for (const tech of hq.stack!) expect(chipText).toContain(tech)
  })

  it('renders the résumé tech chips on a personal card', () => {
    const { container } = render(<RoomSections />)
    const kc = projects.find((p) => p.slug === 'kingdoms-and-crowns')!
    const chipText = Array.from(container.querySelectorAll('li')).map((li) => li.textContent)
    for (const tech of kc.stack!) expect(chipText).toContain(tech)
  })
})
