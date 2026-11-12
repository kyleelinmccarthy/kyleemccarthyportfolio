'use client'

import { looks } from '@/content/sky'
import type { SkyLook } from '@/content/types'
import { useTheme } from './ThemeProvider'

const gradient = (look: SkyLook) => `linear-gradient(to top, ${look.bot}, ${look.mid}, ${look.top})`

/**
 * The sky, behind everything: a gradient from the current look's horizon to its
 * zenith. The canvas covers it in Task 11, and it stays as the fallback.
 *
 * The server and the first client render do not know the visitor's hour, so
 * the stylesheet carries the two skies the theme already tells us about
 * (data-theme is set before first paint). Only the morning and evening looks,
 * which need the clock, are applied inline once it has been read.
 */
export function SkyBackdrop() {
  const { look } = useTheme()
  const needsClock = look === 'morning' || look === 'evening'

  return (
    <>
      <style>
        {`.sky-backdrop{background:${gradient(looks.afternoon)}}` +
          `[data-theme='night'] .sky-backdrop{background:${gradient(looks.night)}}`}
      </style>
      <div
        aria-hidden
        className="sky-backdrop fixed inset-0 z-0"
        style={needsClock ? { background: gradient(looks[look]) } : undefined}
      />
    </>
  )
}
