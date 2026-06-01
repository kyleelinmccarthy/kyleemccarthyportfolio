'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { type Theme, getStoredTheme, persistTheme } from '@/lib/theme'

/**
 * A literal wall light switch. Lever flips UP for light ("lights on") and DOWN
 * for dark ("off"), with a warm glow when on. Reads as a physical switch, not
 * the generic sun/moon toggle. Reads the pre-hydration theme, then flips it.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'light' ? 'light' : getStoredTheme() ?? 'dark')
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    persistTheme(next)
  }

  const isLight = mounted && theme === 'light'
  const label = theme === 'dark' ? 'Turn the lights on (light mode)' : 'Turn the lights off (dark mode)'
  const move = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 700, damping: 26 }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`group relative inline-flex items-center justify-center focus-visible:outline-none ${className}`}
    >
      <span className="sr-only">{label}</span>

      {/* Warm glow when the lights are on */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(219,110,78,0.55), transparent 70%)' }}
        initial={false}
        animate={{ opacity: isLight ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      />

      {/* Faceplate */}
      <span className="relative h-[42px] w-[28px] rounded-[6px] border border-rule bg-surface-raised shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-black/5 transition-colors group-focus-visible:border-accent">
        {/* Switch slot */}
        <span className="absolute inset-x-[5px] inset-y-[5px] rounded-[3px] bg-black/15">
          {/* Lever */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 h-[15px] rounded-[3px] border border-black/10 bg-gradient-to-b from-cream to-[#cbb89c]"
            initial={false}
            animate={{ top: isLight ? 1 : 16 }}
            transition={move}
          />
        </span>
      </span>
    </button>
  )
}
