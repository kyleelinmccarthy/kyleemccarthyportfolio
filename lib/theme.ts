export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'kym-theme'

/**
 * Resolve the effective theme from an explicit stored choice + system preference.
 * Rules (from the brief): explicit choice always wins; otherwise follow system;
 * when there is no preference at all, default to dark.
 */
export function resolveTheme(opts: {
  stored: Theme | null
  systemPrefersDark: boolean
}): Theme {
  if (opts.stored === 'light' || opts.stored === 'dark') return opts.stored
  return opts.systemPrefersDark ? 'dark' : 'light'
}

/** Read the persisted explicit choice (null = follow system). SSR-safe. */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(THEME_STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

/** Persist an explicit choice and reflect it on <html>. */
export function persistTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Inline, pre-hydration script string. Runs before first paint to set
 * data-theme on <html>, preventing a flash of the wrong theme (FOUC).
 * Kept dependency-free and minified-by-hand so it stays tiny.
 */
export function themeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{var s=localStorage.getItem('${storageKey}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(d?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`
}
