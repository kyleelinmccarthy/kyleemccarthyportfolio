import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Legend } from '@/components/hud/Legend'
import { tourDistricts as districts } from '@/content/world'

/** jsdom has no matchMedia: stand in a screen that is, or is not, phone-narrow. */
function screenIs(narrow: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: narrow, addEventListener: () => {}, removeEventListener: () => {} }))
}

afterEach(() => vi.unstubAllGlobals())

describe('Legend', () => {
  it('lists the five districts, numbered in tour order', () => {
    screenIs(false)
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
    screenIs(false)
    render(<Legend districts={districts} />)
    expect(screen.queryByText(/06/)).toBeNull()
  })

  it('stands on a plate, so its text holds whatever drifts behind it', () => {
    screenIs(false)
    render(<Legend districts={districts} />)
    expect(screen.getByRole('list').parentElement).toHaveClass('hud-plate')
  })

  it('links each district to its own island', () => {
    screenIs(false)
    render(<Legend districts={districts} />)
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/?district=home',
      '/?district=works',
      '/?district=hours',
      '/?district=frenzy',
      '/?district=studio',
    ])
  })

  it('starts open on a wide screen, and its heading folds it and brings it back', () => {
    screenIs(false)
    render(<Legend districts={districts} />)
    const heading = screen.getByRole('button', { name: 'Districts' })
    const plate = screen.getByRole('list').parentElement!
    expect(heading).toHaveAttribute('aria-expanded', 'true')
    expect(heading).toHaveAttribute('aria-controls', screen.getByRole('list').id)
    // Until the visitor chooses, CSS decides by width: no mark on the plate.
    expect(plate).not.toHaveAttribute('data-open')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(plate).toHaveAttribute('data-open', 'false')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'true')
    expect(plate).toHaveAttribute('data-open', 'true')
  })

  it('starts folded on a phone, and one press opens it', () => {
    screenIs(true)
    render(<Legend districts={districts} />)
    const heading = screen.getByRole('button', { name: 'Districts' })
    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('list').parentElement).not.toHaveAttribute('data-open')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list').parentElement).toHaveAttribute('data-open', 'true')
  })
})
