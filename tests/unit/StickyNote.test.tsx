import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeskRoom } from '@/components/rooms/Desk'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'

describe('The Desk', () => {
  it('holds every project that is not on the wall, and none that is', () => {
    render(<DeskRoom />)
    const onDesk = projects.filter((p) => !FEATURED.includes(p.slug as never))
    for (const p of onDesk) expect(screen.getByText(p.name)).toBeInTheDocument()
    for (const slug of FEATURED) {
      const featured = projects.find((p) => p.slug === slug)!
      expect(screen.queryByText(featured.name)).toBeNull()
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
    // Ten notes fit at a readable size. Paging them added a second thing to
    // scroll and a second thing to fight the page scroll, for nothing.
    const { container } = render(<DeskRoom />)
    const onDesk = projects.filter((p) => !FEATURED.includes(p.slug as never))
    expect(container.querySelectorAll('li')).toHaveLength(onDesk.length)
  })

  it('makes a note with a live URL a real link', () => {
    render(<DeskRoom />)
    const withUrl = projects.find((p) => !FEATURED.includes(p.slug as never) && p.liveUrl)!
    // The first desk project with a liveUrl is "Eliminated (web)" — its name
    // contains regex metacharacters, so it must be escaped before building a
    // RegExp out of it, or the parens are read as a capture group and the
    // pattern never matches the literal text.
    const escaped = withUrl.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const link = screen.getByRole('link', { name: new RegExp(escaped, 'i') })
    expect(link).toHaveAttribute('href', withUrl.liveUrl!)
  })
})
