import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { Greeting } from '@/components/hud/Greeting'
import { welcome } from '@/content/sky'

function tree() {
  return (
    <ThemeProvider>
      <Greeting />
    </ThemeProvider>
  )
}

afterEach(() => {
  vi.useRealTimers()
  window.sessionStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('Greeting', () => {
  it('says the time-of-day greeting and the welcome line once the clock is read', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 10, 23, 0))
    render(tree())
    expect(screen.getByText('Up late? So am I.')).toBeInTheDocument()
    expect(screen.getByText(welcome)).toBeInTheDocument()
  })

  it('greets the morning in the morning', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 10, 8, 0))
    render(tree())
    expect(screen.getByText('Morning.')).toBeInTheDocument()
  })

  it('renders only the welcome line before the effect runs (the server render)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 10, 23, 0))
    const html = renderToString(tree())
    expect(html).toContain(welcome)
    expect(html).not.toContain('Up late')
    expect(html).not.toContain('Morning.')
    expect(html).not.toContain('Afternoon.')
    expect(html).not.toContain('Evening.')
  })
})
