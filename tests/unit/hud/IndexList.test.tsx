import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { IndexList } from '@/components/hud/IndexList'
import { districts, places, tourOrder } from '@/content/world'

describe('IndexList', () => {
  it('links every place under its district, numbered in tour order', () => {
    render(<IndexList districts={districts} places={places} tourOrder={tourOrder} />)
    expect(screen.getAllByRole('link')).toHaveLength(19)
    expect(screen.getByRole('link', { name: /03\s*Beacon/ })).toHaveAttribute('href', '/places/beacon')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'The Works',
      'Tiny Frenzy',
      'After Hours',
      'The Studio',
      'Home',
    ])
  })

  it('is the navigation landmark named "Every place", with the id the Index control points at', () => {
    render(<IndexList districts={districts} places={places} tourOrder={tourOrder} />)
    const nav = screen.getByRole('navigation', { name: 'Every place' })
    expect(nav).toHaveAttribute('id', 'index')
  })

  it('lists each district’s places under its own heading', () => {
    render(<IndexList districts={districts} places={places} tourOrder={tourOrder} />)
    const works = screen.getByRole('heading', { level: 2, name: 'The Works' }).closest('section')!
    expect(within(works).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/places/beacon',
      '/places/403hq',
      '/places/aura',
      '/places/ruckus',
      '/places/nbs-website',
      '/places/on-the-go',
    ])
  })
})
