import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { principles } from '@/content/principles'
import { placeById } from '@/content/world'

describe('principles panel', () => {
  it('shows the three principles with their text', () => {
    render(<PlacePanelBody place={placeById('three-things')!} />)
    for (const title of ['Keep moving', 'Nothing is sacred', 'AI is a tool, not the problem']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(principles.items).toHaveLength(3)
    for (const p of principles.items) expect(screen.getByText(p.body)).toBeInTheDocument()
  })
})
