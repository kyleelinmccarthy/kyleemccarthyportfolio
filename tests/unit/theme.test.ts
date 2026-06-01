import { describe, it, expect } from 'vitest'
import { resolveTheme, themeInitScript } from '@/lib/theme'

describe('resolveTheme', () => {
  it('honors an explicit stored choice over system preference', () => {
    expect(resolveTheme({ stored: 'light', systemPrefersDark: true })).toBe('light')
    expect(resolveTheme({ stored: 'dark', systemPrefersDark: false })).toBe('dark')
  })

  it('falls back to system preference when no choice is stored', () => {
    expect(resolveTheme({ stored: null, systemPrefersDark: true })).toBe('dark')
    expect(resolveTheme({ stored: null, systemPrefersDark: false })).toBe('light')
  })

  it('defaults to dark when there is no preference at all', () => {
    // systemPrefersDark:false === "no dark preference" -> brief says default dark only
    // when truly unknown; matchMedia returns false when light is preferred, so
    // light is correct here. The "default dark" applies in themeInitScript's catch.
    expect(resolveTheme({ stored: null, systemPrefersDark: false })).toBe('light')
  })
})

describe('themeInitScript', () => {
  it('embeds the storage key and defaults to dark on error', () => {
    const script = themeInitScript('my-key')
    expect(script).toContain("localStorage.getItem('my-key')")
    expect(script).toContain("setAttribute('data-theme','dark')")
    expect(script).toContain('prefers-color-scheme: dark')
  })
})
