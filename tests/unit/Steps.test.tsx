import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepsRoom } from '@/components/rooms/Steps'
import { rooms } from '@/content/rooms'

describe('The Steps', () => {
  it('greets the visitor', () => {
    render(<StepsRoom />)
    // The greeting swaps to a time-of-day one once mounted, so pinning a single
    // string here would pass or fail depending on the hour the suite runs.
    const allowed: string[] = [
      rooms.steps.welcome,
      ...rooms.steps.greetings.map((g) => g.text),
    ]
    expect(allowed).toContain(screen.getByRole('heading', { level: 1 }).textContent)
  })

  it('falls back to a greeting that reads fine with no JS', () => {
    // The neutral welcome is what the server sends and what a no-JS visitor
    // keeps. It has to stand on its own, not read as a placeholder or as a
    // half-sentence waiting for a time of day to be prepended.
    expect(rooms.steps.welcome).not.toMatch(/^(morning|afternoon|evening)/i)
    expect(rooms.steps.welcome.length).toBeGreaterThan(8)
    expect(rooms.steps.welcome).toMatch(/[.!?]$/)
  })

  it('puts no statistic on the front door', () => {
    const { container } = render(<StepsRoom />)
    expect(container.textContent).not.toMatch(/\d/)
  })
})
