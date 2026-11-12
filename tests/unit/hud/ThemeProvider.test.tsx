import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { ThemeProvider, useTheme } from '@/components/hud/ThemeProvider'
import { THEME_STORAGE_KEY } from '@/lib/theme'

function Probe() {
  const { theme, band, look } = useTheme()
  return <p data-testid="probe">{`${theme} ${band} ${look}`}</p>
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

function at(hour: number) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 10, hour, 0))
}

afterEach(() => {
  vi.useRealTimers()
  window.sessionStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeProvider', () => {
  it('renders day / afternoon on the server whatever the hour', () => {
    at(23)
    const html = renderToString(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(html).toContain('day afternoon afternoon')
  })

  it('resolves the real band and look from the clock after mount', () => {
    at(23)
    renderProbe()
    expect(screen.getByTestId('probe')).toHaveTextContent('night late night')
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
  })

  it('uses the evening look by day in the evening', () => {
    at(17)
    renderProbe()
    expect(screen.getByTestId('probe')).toHaveTextContent('day evening evening')
  })

  it('takes the theme the init script already set over the clock', () => {
    at(12)
    document.documentElement.setAttribute('data-theme', 'night')
    renderProbe()
    expect(screen.getByTestId('probe')).toHaveTextContent('night afternoon night')
  })

  it('takes a stored choice over the clock when the init script did not run', () => {
    at(12)
    window.sessionStorage.setItem(THEME_STORAGE_KEY, 'night')
    renderProbe()
    expect(screen.getByTestId('probe')).toHaveTextContent('night afternoon night')
  })

  it('throws a clear error when useTheme is used outside a provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/)
    quiet.mockRestore()
  })
})
