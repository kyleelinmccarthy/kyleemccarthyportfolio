import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Legend } from '@/components/hud/Legend'
import { tourDistricts as districts } from '@/content/world'

describe('Legend', () => {
  it('lists the five districts, numbered in tour order', () => {
    render(<Legend districts={districts} />)
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      expect.stringMatching(/^01Home/),
      expect.stringMatching(/^02The Works/),
      expect.stringMatching(/^03After Hours/),
      expect.stringMatching(/^04Tiny Frenzy/),
      expect.stringMatching(/^05The Studio/),
    ])
    expect(screen.getByRole('link', { name: /The Works/ })).toHaveAttribute('href', '/?district=works')
  })

  it('does not show a count of places, which read as a second, conflicting number', () => {
    render(<Legend districts={districts} />)
    expect(screen.queryByText(/06/)).toBeNull()
  })

  it('stands on a plate, so its text holds whatever drifts behind it', () => {
    render(<Legend districts={districts} />)
    expect(screen.getByRole('list')).toHaveClass('hud-plate')
  })

  it('links each district to its own island', () => {
    render(<Legend districts={districts} />)
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/?district=home',
      '/?district=works',
      '/?district=hours',
      '/?district=frenzy',
      '/?district=studio',
    ])
  })
})
