import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  persistTheme,
  resolveTheme,
  themeInitScript,
} from '@/lib/theme'
import { dayHours } from '@/content/sky'

afterEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-js')
})

describe('resolveTheme', () => {
  it('lets an explicit choice win', () => {
    expect(resolveTheme({ stored: 'night', hour: 12 })).toBe('night')
    expect(resolveTheme({ stored: 'day', hour: 23 })).toBe('day')
  })

  it('follows the clock otherwise', () => {
    expect(resolveTheme({ stored: null, hour: 12 })).toBe('day')
    expect(resolveTheme({ stored: null, hour: 23 })).toBe('night')
    expect(resolveTheme({ stored: null, hour: 5 })).toBe('night')
  })
})

describe('themeInitScript', () => {
  it('reads sessionStorage, never localStorage, and defaults to day on error', () => {
    const s = themeInitScript()
    expect(s).toContain("sessionStorage.getItem('kym-theme')")
    expect(s).not.toContain('localStorage')
    expect(s).toContain("'day'")
  })

  it('embeds the day hours from content/sky.ts', () => {
    const s = themeInitScript()
    expect(s).toContain(`h>=${dayHours.from}`)
    expect(s).toContain(`h<${dayHours.to}`)
  })

  it('sets data-theme and data-js on <html> when run', () => {
    window.sessionStorage.setItem(THEME_STORAGE_KEY, 'night')
    new Function(themeInitScript())()
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
    expect(document.documentElement.getAttribute('data-js')).toBe('true')
  })

  it('falls back to the clock through the same day hours', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 10, dayHours.to - 1, 30))
      new Function(themeInitScript())()
      expect(document.documentElement.getAttribute('data-theme')).toBe('day')
      vi.setSystemTime(new Date(2026, 10, 10, dayHours.to, 0))
      new Function(themeInitScript())()
      expect(document.documentElement.getAttribute('data-theme')).toBe('night')
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    [23, 'night'],
    [12, 'day'],
  ])('follows the clock when storage throws (hour %i gives %s)', (hour, expected) => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 10, hour, 0))
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied')
      })
      new Function(themeInitScript())()
      expect(document.documentElement.getAttribute('data-theme')).toBe(expected)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('stored theme', () => {
  it('round-trips through sessionStorage and sets data-theme', () => {
    expect(getStoredTheme()).toBeNull()
    persistTheme('night')
    expect(window.sessionStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
    expect(getStoredTheme()).toBe('night')
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
  })

  it('ignores a stored value that is not a theme', () => {
    window.sessionStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getStoredTheme()).toBeNull()
  })

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(getStoredTheme()).toBeNull()
    expect(() => persistTheme('night')).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
  })
})
