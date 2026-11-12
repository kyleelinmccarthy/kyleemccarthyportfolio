'use client'

import { welcome } from '@/content/sky'
import { useTheme } from './ThemeProvider'

/** The time-of-day greeting then the welcome line. Until the clock is read, only the welcome line. */
export function Greeting({ className = '' }: { className?: string }) {
  const { greeting } = useTheme()

  return (
    <p className={`font-mono text-[10.5px] uppercase leading-[1.9] tracking-[0.13em] text-muted ${className}`}>
      {greeting ? <span>{greeting} </span> : null}
      <span>{welcome}</span>
    </p>
  )
}
