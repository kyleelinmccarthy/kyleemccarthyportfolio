import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { about, hero } from '@/content/about'
import { education, growth, milestones } from '@/content/timeline'
import { placeById } from '@/content/world'

describe('about panel', () => {
  it('shows the portrait, the five milestones, the growth figures, both degrees and the résumé', () => {
    render(<PlacePanelBody place={placeById('home')!} />)
    expect(screen.getByAltText('Portrait of Kylee McCarthy')).toBeInTheDocument()

    expect(milestones).toHaveLength(5)
    for (const m of milestones) expect(screen.getByRole('heading', { name: m.title, level: 3 })).toBeInTheDocument()

    // Scoped: "200" is also a figure in the day-job block.
    const chart = screen.getByRole('figure', { name: growth.label })
    expect(within(chart).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('40'),
      expect.stringContaining('130'),
      expect.stringContaining('200'),
    ])
    for (const s of growth.series) {
      expect(within(chart).getByText(String(s.value))).toBeInTheDocument()
      expect(within(chart).getByText(s.period)).toBeInTheDocument()
    }

    expect(education).toHaveLength(2)
    for (const degree of education) expect(screen.getByText(degree)).toBeInTheDocument()

    const resume = screen.getByRole('link', { name: /Résumé/ })
    expect(resume).toHaveAttribute('href', '/Kylee-McCarthy-Resume.pdf')
  })

  it('shows who she is and how she got here, but not the line that points at the retired pages', () => {
    render(<PlacePanelBody place={placeById('home')!} />)
    expect(screen.getByText(hero.headline)).toBeInTheDocument()
    expect(screen.getByText(hero.why)).toBeInTheDocument()
    expect(screen.getByText(about.arc.lede)).toBeInTheDocument()
    // "The work itself is on the portfolio page, and the personal side is in the library."
    expect(screen.queryByText(about.lede)).toBeNull()
    expect(screen.queryByText(/portfolio page|the library/i)).toBeNull()
  })

  it('does not render a second h1', () => {
    render(<PlacePanelBody place={placeById('home')!} />)
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
