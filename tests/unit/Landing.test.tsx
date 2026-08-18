import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingRoom } from '@/components/rooms/Landing'
import { rooms } from '@/content/rooms'

describe('The Window', () => {
  it('renders all three principles with their bodies', () => {
    render(<LandingRoom />)
    for (const p of rooms.landing.principles) {
      expect(screen.getByText(p.title)).toBeInTheDocument()
      expect(screen.getByText(p.body)).toBeInTheDocument()
    }
  })

  it('uses a heading level below the page h1', () => {
    render(<LandingRoom />)
    expect(screen.getByRole('heading', { name: rooms.landing.heading, level: 2 })).toBeInTheDocument()
  })
})
