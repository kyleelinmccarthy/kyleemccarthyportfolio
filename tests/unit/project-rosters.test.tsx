import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectDetails } from '@/components/ProjectDetails'
import { ShelfRoom } from '@/components/room/libraryRooms'
import { projects } from '@/content/projects'

const personal = projects.filter((p) => p.isPersonal)

/**
 * Spec §4 splits the roster: /work carries the 8 professional builds, /room
 * carries the 9 personal ones. ProjectDetails used to map the unfiltered list,
 * so all 17 rendered on /work and the 9 personal cards appeared on both pages.
 * These pin the rendered counts, not just the data.
 *
 * The library shows its nine as books on a shelf rather than as cards, so the
 * room side counts spines. The detail is the same content, in the dialog a
 * spine opens.
 */
describe('project rosters are split between /work and /room', () => {
  it('renders only the 8 professional projects on /work', () => {
    const { container } = render(<ProjectDetails />)
    const cards = container.querySelectorAll('article')
    expect(cards).toHaveLength(8)

    for (const p of personal) {
      expect(
        screen.queryByRole('heading', { name: p.name, level: 3 }),
        `${p.slug} is personal and must not appear on /work`
      ).toBeNull()
    }
  })

  it('shelves only the 9 personal projects in the library', () => {
    render(<ShelfRoom />)
    for (const p of personal) {
      expect(
        screen.getByRole('button', { name: p.name }),
        `${p.slug} should be on the shelf`
      ).toBeInTheDocument()
    }
    for (const p of projects.filter((x) => !x.isPersonal)) {
      expect(
        screen.queryByRole('button', { name: p.name }),
        `${p.slug} is professional and must not appear in the library`
      ).toBeNull()
    }
  })

  it('shows no project on both pages', () => {
    const work = render(<ProjectDetails />).container
    const workNames = Array.from(work.querySelectorAll('article h3')).map((h) => h.textContent)
    const shelfNames = personal.map((p) => p.name)
    expect(workNames.filter((n) => shelfNames.includes(n!))).toEqual([])
  })
})

describe('stack chips', () => {
  it('renders the résumé tech chips on a professional card', () => {
    const { container } = render(<ProjectDetails />)
    const hq = projects.find((p) => p.slug === '403hq')!
    const chipText = Array.from(container.querySelectorAll('li')).map((li) => li.textContent)
    for (const tech of hq.stack!) expect(chipText).toContain(tech)
  })

  it('renders the résumé tech chips inside a personal project’s book', () => {
    // The shelf mounts one dialog holding whichever book is open, and the
    // first volume is open by default — so the first personal project's pages
    // are in the document without a click.
    const first = personal[0]!
    const { container } = render(<ShelfRoom />)
    const chipText = Array.from(container.querySelectorAll('li')).map((li) => li.textContent)
    for (const tech of first.stack ?? []) expect(chipText).toContain(tech)
    expect(first.stack?.length ?? 0).toBeGreaterThan(0)
  })
})
