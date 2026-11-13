import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NameLogo, SIGNATURE } from '@/components/hud/NameLogo'
import { site } from '@/content/site'

describe('the signature', () => {
  it('spells her name, run by run', () => {
    expect(SIGNATURE.map(([letters]) => letters).join('')).toBe(site.name)
  })

  it('is read once, as her name: the lettering is for the eye only', () => {
    const { container } = render(
      <h1>
        <NameLogo />
      </h1>,
    )
    expect(screen.getByRole('heading', { level: 1, name: site.name })).toBeInTheDocument()
    const lettering = container.querySelector('[aria-hidden]')!
    expect(lettering.textContent).toBe(site.name)
    // Its capitals in one hand, the rest in the other.
    expect(lettering.querySelectorAll('.font-signature-caps')).toHaveLength(2)
    expect(lettering.querySelectorAll('.font-signature')).toHaveLength(3)
  })
})
