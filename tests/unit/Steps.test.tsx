import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepsRoom } from '@/components/rooms/Steps'
import { rooms } from '@/content/rooms'

describe('The Steps', () => {
  it('shows the welcome and the one line', () => {
    render(<StepsRoom />)
    expect(screen.getByText(rooms.steps.welcome)).toBeInTheDocument()
    expect(screen.getByText(rooms.steps.line)).toBeInTheDocument()
  })

  it('puts no statistic on the front door', () => {
    const { container } = render(<StepsRoom />)
    expect(container.textContent).not.toMatch(/\d/)
  })
})
