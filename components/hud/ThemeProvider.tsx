'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Band, LookKey, Theme } from '@/content/types'
import { getStoredTheme, persistTheme, resolveTheme } from '@/lib/theme'
import { bandOf, greetingFor, lookFor } from '@/lib/world/time'

interface ThemeValue {
  theme: Theme
  band: Band
  look: LookKey
  /** The salutation for the visitor's hour. Null until the clock has been read on the client. */
  greeting: string | null
  setTheme(theme: Theme): void
}

const ThemeContext = createContext<ThemeValue | null>(null)

/**
 * The server cannot know the visitor's hour, so the server render and the
 * first client render both say day / afternoon. The real theme, band and
 * greeting are resolved once, in an effect, and do not change mid-visit.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('day')
  const [band, setBand] = useState<Band>('afternoon')
  const [greeting, setGreeting] = useState<string | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()
    const root = document.documentElement
    // The init script has normally set this before paint; take its word for it.
    const set = root.getAttribute('data-theme')
    const resolved: Theme =
      set === 'day' || set === 'night' ? set : resolveTheme({ stored: getStoredTheme(), hour })
    if (set !== resolved) root.setAttribute('data-theme', resolved)
    setThemeState(resolved)
    setBand(bandOf(hour))
    setGreeting(greetingFor(hour))
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    persistTheme(next)
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ theme, band, look: lookFor(theme, band), greeting, setTheme }),
    [theme, band, greeting, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider')
  return value
}
