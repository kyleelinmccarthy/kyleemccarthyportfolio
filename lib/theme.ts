import { dayHours } from '@/content/sky'
import type { Theme } from '@/content/types'
import { themeForHour } from '@/lib/world/time'

export type { Theme }

/** sessionStorage, not localStorage: a choice lasts for the visit, then the clock decides again. */
export const THEME_STORAGE_KEY = 'kym-theme'

function isTheme(value: unknown): value is Theme {
  return value === 'day' || value === 'night'
}

/** An explicit choice always wins; otherwise the visitor's clock decides. */
export function resolveTheme(opts: { stored: Theme | null; hour: number }): Theme {
  return isTheme(opts.stored) ? opts.stored : themeForHour(opts.hour)
}

/** The choice made earlier this visit. Null on the server, with nothing stored, or if storage throws. */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

/** Reflect a theme on <html> and remember it for the visit. Never throws. */
export function persistTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  try {
    window.sessionStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Blocked storage only means the choice does not outlast this page.
  }
}

/**
 * Inline script that runs before first paint, so the page never flashes the
 * wrong theme. It cannot import anything, so the day hours from
 * `content/sky.ts` are written into the string. Blocked storage falls back to the
 * clock; only an error outside storage leaves the theme as day.
 */
export function themeInitScript(): string {
  return (
    `(function(){var e=document.documentElement;e.setAttribute('data-js','true');` +
    `try{var s=null;try{s=sessionStorage.getItem('${THEME_STORAGE_KEY}')}catch(x){}` +
    `var h=new Date().getHours();` +
    `var t=(s==='day'||s==='night')?s:(h>=${dayHours.from}&&h<${dayHours.to}?'day':'night');` +
    `e.setAttribute('data-theme',t)}catch(x){e.setAttribute('data-theme','day')}})();`
  )
}
