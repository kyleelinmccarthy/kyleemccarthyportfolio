import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Placard } from '@/components/rooms/Placard'
import { caseStudies } from '@/content/caseStudies'

const study = caseStudies.find((c) => c.slug === '403hq')!

describe('Placard', () => {
  it('starts closed and opens to reveal what went wrong', async () => {
    const user = userEvent.setup()
    render(<Placard study={study} />)
    const summary = screen.getByText(/what went wrong/i)
    expect(screen.queryByText(study.placard.threwAway)).not.toBeVisible()
    await user.click(summary)
    expect(screen.getByText(study.placard.threwAway)).toBeVisible()
  })

  it('is a native disclosure so it works without JS', () => {
    const { container } = render(<Placard study={study} />)
    expect(container.querySelector('details')).not.toBeNull()
    expect(container.querySelector('summary')).not.toBeNull()
  })
})
