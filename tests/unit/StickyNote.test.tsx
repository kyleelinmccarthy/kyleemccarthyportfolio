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
