import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { artAlt, artIntro, tattooAlt, tattooIntro } from '@/content/art'
import { placeById } from '@/content/world'
import { groupArt } from '@/lib/artGroups'

describe('gallery panel', () => {
  it('groups the art by medium under six headings, and every picture has alt text', () => {
    const { container } = render(<PlacePanelBody place={placeById('art')!} />)
    const labels = groupArt(artAlt).map((g) => g.label)
    expect(labels).toHaveLength(6)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(labels)

    expect(container.querySelectorAll('li img')).toHaveLength(Object.keys(artAlt).length)
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')?.trim()).toBeTruthy()
  })

  it('shows the intros that are still true, and not the library-only hint', () => {
    const { unmount } = render(<PlacePanelBody place={placeById('art')!} />)
    expect(screen.getByText(artIntro.lede)).toBeInTheDocument()
    expect(screen.queryByText(/take one down/i)).toBeNull()
    unmount()
    render(<PlacePanelBody place={placeById('tattoo-designs')!} />)
    expect(screen.getByText(tattooIntro.lede)).toBeInTheDocument()
  })

  it('shows the five tattoo designs', () => {
    const { container } = render(<PlacePanelBody place={placeById('tattoo-designs')!} />)
    expect(Object.keys(tattooAlt)).toHaveLength(5)
    expect(container.querySelectorAll('li img')).toHaveLength(5)
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')?.trim()).toBeTruthy()
  })
})
