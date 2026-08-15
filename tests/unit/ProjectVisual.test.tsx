import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectVisual } from '@/components/media/ProjectVisual'

describe('ProjectVisual', () => {
  it('renders the hero image with its authored alt text', () => {
    render(
      <ProjectVisual
        name="Kingdoms & Crowns"
        media={{ hero: { src: '/media/kingdoms-and-crowns/hero.jpg', alt: 'The quest log' } }}
      />
    )
    expect(screen.getByAltText('The quest log')).toBeInTheDocument()
  })

  it('falls back to a decorative panel when a project has no media', () => {
    const { container } = render(<ProjectVisual name="Beacon" />)
    expect(container.querySelector('img')).toBeNull()
    // The fallback is decoration, not content — it must not be announced.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
