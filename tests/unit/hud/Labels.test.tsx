import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Labels } from '@/components/hud/Labels'
import { constellations, night } from '@/content/sky'
import { districts, places } from '@/content/world'
import { LABELS_ID, constellationLabelId, labelsLandmark } from '@/lib/world/labels'

describe('Labels', () => {
  it('is not announced as a landmark while no label in it shows', () => {
    const { container } = render(<Labels districts={districts} places={places} />)
    expect(screen.queryByRole('navigation', { hidden: true })).toBeNull()
    expect(container.querySelector(`#${LABELS_ID}`)).not.toBeNull()
    // The canvas makes it one, named, once any label shows, and takes it away when none does.
    expect(labelsLandmark(0)).toBeNull()
    expect(labelsLandmark(3)).toEqual({ role: 'navigation', name: 'Places on the map' })
  })

  it('names each constellation as plain text, not a link, that cannot be focused', () => {
    const { container } = render(<Labels districts={districts} places={places} />)
    // Only the places and the districts are links.
    expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(places.length + districts.length)
    for (const c of constellations) {
      const el = container.querySelector(`#${constellationLabelId(c.name)}`)
      expect(el, c.name).not.toBeNull()
      expect(el!.textContent).toBe(c.name)
      expect(el!.closest('a')).toBeNull()
      expect(el!.querySelector('a, button, [tabindex]')).toBeNull()
      expect(el!.hasAttribute('tabindex')).toBe(false)
      expect(el).toHaveClass('lm', 'lm-const')
      expect((el as HTMLElement).style.getPropertyValue('--c')).toBe(night.constellationLabel)
      // Hidden until the canvas shows it, as every label is.
      expect(el!.hasAttribute('data-on')).toBe(false)
    }
  })
})
