import { afterEach, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { ThemeToggle } from '@/components/hud/ThemeToggle'
import { THEME_STORAGE_KEY } from '@/lib/theme'

function renderToggle(initial: 'day' | 'night') {
  // The init script has already run by the time React mounts; mimic that.
  document.documentElement.setAttribute('data-theme', initial)
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

afterEach(() => {
  window.sessionStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('shows "Night" and is named "Switch to night" in the day', () => {
    renderToggle('day')
    const button = screen.getByRole('button', { name: 'Switch to night' })
    expect(button).toHaveTextContent('Night')
  })

  it('shows "Day" and is named "Switch to day" at night', () => {
    renderToggle('night')
    const button = screen.getByRole('button', { name: 'Switch to day' })
    expect(button).toHaveTextContent('Day')
  })

  it('switches to night when clicked in the day, and remembers it for the visit', async () => {
    renderToggle('day')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to night' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
    expect(window.sessionStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
    expect(screen.getByRole('button', { name: 'Switch to day' })).toHaveTextContent('Day')
  })

  it('switches to day when clicked at night', async () => {
    renderToggle('night')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to day' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('day')
    expect(window.sessionStorage.getItem(THEME_STORAGE_KEY)).toBe('day')
    expect(screen.getByRole('button', { name: 'Switch to night' })).toHaveTextContent('Night')
  })
})
