'use client'

import { useTheme } from './ThemeProvider'

/** Names the theme it will switch to: "Night" by day, "Day" at night. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const next = theme === 'day' ? 'night' : 'day'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next}`}
      className={`glass px-[15px] py-[11px] font-mono text-[11px] uppercase leading-none tracking-[0.13em] text-ink transition-transform hover:-translate-y-px ${className}`}
    >
      {next === 'night' ? 'Night' : 'Day'}
    </button>
  )
}
