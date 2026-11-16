import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/hud/Header'
import { IndexDrawerProvider, useIndexDrawer } from '@/components/hud/IndexDrawer'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { hero, proof } from '@/content/about'
import { site } from '@/content/site'

function OpenState() {
  return <output>{String(useIndexDrawer().open)}</output>
}

function renderHeader(home: boolean) {
  return render(
    <ThemeProvider>
      <IndexDrawerProvider>
        <Header home={home} />
        <OpenState />
      </IndexDrawerProvider>
    </ThemeProvider>,
  )
}

describe('Header', () => {
  it('on the home page, the name is the h1, with the role line and headline under it', () => {
    renderHeader(true)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(site.name)
    expect(screen.getByText('Director of Technology Operations · Builder · Artist')).toBeInTheDocument()
    expect(screen.getByText(hero.headline)).toBeInTheDocument()
  })

  it('lets the role line, headline and greeting give way when the camera comes close, never the name or the controls (R31)', () => {
    renderHeader(true)
    const away = (el: Element) => el.closest('[data-gives-way]') !== null
    expect(away(screen.getByText(hero.headline))).toBe(true)
    expect(away(screen.getByText('Come have a look around.'))).toBe(true)
    expect(away(screen.getByText('Director of Technology Operations · Builder · Artist'))).toBe(true)
    expect(away(screen.getByRole('heading', { level: 1 }))).toBe(false)
    // The name has its plate for when the planet is behind it.
    expect(screen.getByRole('heading', { level: 1 }).closest('.hud-name')).not.toBeNull()
    for (const control of screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('a, button')) expect(away(control)).toBe(false)
    // What gives way, and what stays, each keeps map labels out from under it.
    expect(screen.getByText(hero.headline).closest('[data-covers-labels]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).closest('[data-covers-labels]')).not.toBeNull()
  })

  it('on the home page, the proof figures stand under the headline as real text, and give way with it', () => {
    renderHeader(true)
    const row = screen.getByText(hero.headline).nextElementSibling!
    expect(row.tagName).toBe('UL')
    expect(within(row as HTMLElement).getAllByRole('listitem').map((li) => li.textContent)).toEqual(proof.map((f) => `${f.value} ${f.label}`))
    expect(row.closest('[data-gives-way]')).not.toBeNull()
    expect(row.closest('[data-covers-labels]')).not.toBeNull()
  })

  it('on a place page, has no proof row', () => {
    renderHeader(false)
    expect(screen.queryByText(proof[0].label)).not.toBeInTheDocument()
  })

  it('on a place page, the name is a link home and there is no h1', () => {
    renderHeader(false)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: site.name })).toHaveAttribute('href', '/')
  })

  it('offers the tour, the index, the profile and the theme, in that order', () => {
    // The provider takes the theme the init script put on <html>, else the
    // clock's. Set it, so this does not depend on the hour or on earlier tests.
    document.documentElement.setAttribute('data-theme', 'day')
    renderHeader(true)
    // The profile: its three side by side, then the menu that holds them where there is no room (CSS shows one of the two).
    const controls = screen.getByRole('navigation', { name: 'Main' }).querySelectorAll(':scope > * > a, :scope > a, :scope > button, summary')
    expect([...controls].map((c) => c.getAttribute('aria-label') ?? c.textContent?.trim())).toEqual([
      'Take the tour →',
      'Navigation',
      'About',
      'Experience',
      'Contact',
      'Profile▾',
      'Switch to night',
    ])
    expect(screen.getByRole('link', { name: /Take the tour/ })).toHaveAttribute('href', '/places/home')
  })

  it('on the home page, Navigation is a button that opens the drawer', async () => {
    renderHeader(true)
    const button = screen.getByRole('button', { name: 'Navigation' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('true')
  })

  it('on a place page, Navigation is a link to the index on the home page', () => {
    renderHeader(false)
    expect(screen.queryByRole('button', { name: 'Navigation' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Navigation' })).toHaveAttribute('href', '/#index')
  })
})
