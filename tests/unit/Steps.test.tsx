import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepsRoom } from '@/components/rooms/Steps'
import { rooms } from '@/content/rooms'

describe('The Steps', () => {
  it('greets the visitor with the welcome, whatever the hour', () => {
    render(<StepsRoom />)
    // The salutation depends on the clock, so pinning the whole heading would
    // pass or fail depending on when the suite runs. What is always true: the
    // welcome is there, and anything in front of it is one of the four
    // salutations (or nothing at all, before mount).
    const heading = screen.getByRole('heading', { level: 1 }).textContent ?? ''
    expect(heading).toContain(rooms.steps.welcome)
    const before = heading.slice(0, heading.indexOf(rooms.steps.welcome)).trim()
    const salutations: string[] = ['', ...rooms.steps.greetings.map((g) => g.text)]
    expect(salutations).toContain(before)
  })

  it('sets the salutation and the welcome on their own rows', () => {
    // One long line wrapping wherever the viewport put it is what this
    // replaced; the two rows are the point, not an implementation detail.
    const { container } = render(<StepsRoom />)
    const rowsOfHeading = container.querySelectorAll('h1 > span.block')
    expect(rowsOfHeading).toHaveLength(2)
    expect(rowsOfHeading[1]!.textContent).toBe(rooms.steps.welcome)
  })

  it('falls back to a greeting that reads fine with no JS', () => {
    // The neutral welcome is what the server sends and what a no-JS visitor
    // keeps. It has to stand on its own, not read as a placeholder or as a
    // half-sentence waiting for a time of day to be prepended.
    expect(rooms.steps.welcome).not.toMatch(/^(morning|afternoon|evening)/i)
    expect(rooms.steps.welcome.length).toBeGreaterThan(8)
    expect(rooms.steps.welcome).toMatch(/[.!?]$/)
    // And each salutation has to be a standalone line, not a sentence opener
    // waiting for the welcome to finish it.
    for (const g of rooms.steps.greetings) expect(g.text).toMatch(/[.!?]$/)
  })

  it('puts no statistic on the front door', () => {
    const { container } = render(<StepsRoom />)
    expect(container.textContent).not.toMatch(/\d/)
  })
})
