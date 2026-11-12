import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { placeById } from '@/content/world'

describe('contact panel', () => {
  it('has a form with name, email and message fields, and the hint', () => {
    const { container } = render(<PlacePanelBody place={placeById('post')!} />)
    expect(container.querySelector('form')).not.toBeNull()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(screen.getByText('It goes straight to my inbox and I reply myself.')).toBeInTheDocument()
  })
})
