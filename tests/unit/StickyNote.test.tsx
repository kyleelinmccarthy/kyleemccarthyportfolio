import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeskRoom } from '@/components/rooms/Desk'
import { StickyNote } from '@/components/rooms/StickyNote'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'
import type { Project } from '@/content/types'

const onDesk = projects.filter((p) => !p.isPersonal && !FEATURED.includes(p.slug as never))

describe('The Desk', () => {
  it('holds the professional work that is not on the wall, and nothing else', () => {
    render(<DeskRoom />)
    for (const p of onDesk) expect(screen.getByText(p.name)).toBeInTheDocument()

    // Nothing that is already hung in the gallery.
    for (const slug of FEATURED) {
      const featured = projects.find((p) => p.slug === slug)!
      expect(screen.queryByText(featured.name)).toBeNull()
    }

    // And nothing personal. The desk sits on the working side of the house;
    // the after-hours builds have their own room at the back and were being
    // shown in both.
    for (const p of projects.filter((p) => p.isPersonal)) {
      expect(screen.queryByText(p.name)).toBeNull()
    }
  })

  it('never puts two notes of the same colour next to each other', () => {
    // They were coloured by hashing the slug, which collided: two greens
    // turned up in one row of five and the desk read as a repeating pattern
    // rather than as notes off a pack.
    const { container } = render(<DeskRoom />)
    const colours = [...container.querySelectorAll('li > *')].map(
      (el) => [...el.classList].find((c) => c.startsWith('bg-note-')) ?? ''
    )
    expect(colours.length).toBeGreaterThan(1)
    expect(colours).not.toContain('')
    for (let i = 1; i < colours.length; i++) {
      expect(colours[i], `note ${i} repeats note ${i - 1}`).not.toBe(colours[i - 1])
    }
  })

  it('puts the whole desk on one surface, with nothing to page through', () => {
    // Every note fits at a readable size. Dealing them out a row at a time
    // added a second thing to scroll and a second thing to fight the page
    // scroll, for nothing.
    const { container } = render(<DeskRoom />)
    expect(container.querySelectorAll('li')).toHaveLength(onDesk.length)
  })
})

/** A minimal project, so these cases don't depend on what is on the desk today. */
const note = (over: Partial<Project>): Project =>
  ({
    slug: 'test-note',
    name: 'Test Note',
    descriptor: 'A note',
    category: 'Internal Tools',
    status: 'production',
    headline: 'Something short.',
    problem: 'p',
    built: 'b',
    stack: [],
    isPersonal: false,
    ...over,
  }) as Project

describe('a sticky note', () => {
  it('is a real link when there is somewhere to go', () => {
    render(<StickyNote project={note({ liveUrl: 'https://example.com' })} tilt={0} index={0} />)
    expect(screen.getByRole('link', { name: /test note/i })).toHaveAttribute(
      'href',
      'https://example.com'
    )
  })

  it('offers no hover affordance when there is nowhere to go', () => {
    // The lift and the peeling corner used to be on every note, which promised
    // a click most of them could not honour: the cursor said "this goes
    // somewhere" and then nothing happened.
    const { container } = render(<StickyNote project={note({})} tilt={0} index={0} />)
    expect(container.querySelector('a')).toBeNull()
    const card = container.firstElementChild!
    expect([...card.classList].filter((c) => c.startsWith('hover:'))).toEqual([])
  })

  it('still lifts the notes that do go somewhere', () => {
    const { container } = render(
      <StickyNote project={note({ liveUrl: 'https://example.com' })} tilt={0} index={0} />
    )
    const card = container.firstElementChild!
    expect([...card.classList]).toContain('hover:-translate-y-1')
    // Not mouse-only: keyboard focus gets the same affordance.
    expect([...card.classList]).toContain('focus-visible:-translate-y-1')
  })
})
