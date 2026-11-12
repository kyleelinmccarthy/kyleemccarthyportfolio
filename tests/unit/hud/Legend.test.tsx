import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Legend } from '@/components/hud/Legend'
import { districts, places } from '@/content/world'

describe('Legend', () => {
  it('lists the five districts with their counts', () => {
    render(<Legend districts={districts} places={places} />)
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: /The Works/ })).toHaveAttribute('href', '/?district=works')
    expect(screen.getByText(/06/)).toBeInTheDocument()
  })

  it('stands on a plate, so its text holds whatever drifts behind it', () => {
    render(<Legend districts={districts} places={places} />)
    expect(screen.getByRole('list')).toHaveClass('hud-plate')
  })

  it('links each district to its own island', () => {
    render(<Legend districts={districts} places={places} />)
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/?district=works',
      '/?district=frenzy',
      '/?district=hours',
      '/?district=studio',
      '/?district=home',
    ])
  })
})
