import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WindowRoom } from '@/components/rooms/Window'
import { rooms } from '@/content/rooms'

describe('The Window', () => {
  it('renders all three principles with their bodies', () => {
    render(<WindowRoom />)
    for (const p of rooms.window.principles) {
      expect(screen.getByText(p.title)).toBeInTheDocument()
      expect(screen.getByText(p.body)).toBeInTheDocument()
    }
  })

  it('uses a heading level below the page h1', () => {
    render(<WindowRoom />)
    expect(screen.getByRole('heading', { name: rooms.window.heading, level: 2 })).toBeInTheDocument()
  })
})
