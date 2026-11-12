import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { onTheGo } from '@/content/onTheGo'
import { placeById } from '@/content/world'

describe('collection panel', () => {
  it('lists exactly three items in order, and the third shows its summary', () => {
    render(<PlacePanelBody place={placeById('on-the-go')!} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Paragon',
      'Onboarding',
      'Tech Processes',
    ])
    const summary = onTheGo.find((item): item is { name: string; summary: string } => 'summary' in item)!.summary
    expect(screen.getAllByRole('listitem')[2]).toHaveTextContent(summary)
  })

  it('shows a project item by its headline', () => {
    render(<PlacePanelBody place={placeById('on-the-go')!} />)
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
      'Replacing the recordkeeping platform the business runs on.'
    )
  })
})
