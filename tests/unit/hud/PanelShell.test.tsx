import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanelShell } from '@/components/hud/PanelShell'
import { districts, placeById } from '@/content/world'

describe('PanelShell', () => {
  it('closes back to the place’s own district, not out to the whole planet', () => {
    const place = placeById('beacon')!
    const district = districts.find((d) => d.id === place.district)!
    render(
      <PanelShell place={place} district={district}>
        <p>body</p>
      </PanelShell>,
    )
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/?district=works')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Beacon')
  })
})
