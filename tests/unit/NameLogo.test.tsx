import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NameLogo } from '@/components/primitives/NameLogo'

describe('NameLogo', () => {
  it('exposes the name once as a single labelled image', () => {
    render(<NameLogo />)
    expect(screen.getByRole('img', { name: 'Kylee McCarthy' })).toBeInTheDocument()
    // No stray accessible text nodes — the name is announced exactly once.
    expect(screen.queryByText('Kylee McCarthy')).not.toBeInTheDocument()
  })

  it('marks every decorative letterform span aria-hidden', () => {
    const { container } = render(<NameLogo />)
    const decorative = container.querySelectorAll('span[aria-hidden="true"]')
    expect(decorative.length).toBeGreaterThan(0)
    // The visible letters spell the name across hidden spans.
    const text = Array.from(decorative)
      .map((n) => n.textContent)
      .join('')
    expect(text.replace(/\s+/g, ' ').trim()).toBe('Kylee McCarthy')
  })
})
