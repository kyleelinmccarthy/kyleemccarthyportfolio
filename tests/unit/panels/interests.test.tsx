import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { offTheClock } from '@/content/interests'
import { placeById } from '@/content/world'

describe('interests panel', () => {
  it('shows the seven interests with their text', () => {
    render(<PlacePanelBody place={placeById('off-the-clock')!} />)
    expect(offTheClock.items.map((i) => i.title)).toEqual([
      'Reading and writing',
      'Homeschooling',
      'Outside',
      'A lot of pets',
      'Games',
      'Anime',
      'Concerts',
    ])
    for (const item of offTheClock.items) {
      expect(screen.getByRole('heading', { name: item.title, level: 2 })).toBeInTheDocument()
      expect(screen.getByText(item.body)).toBeInTheDocument()
    }
  })
})
