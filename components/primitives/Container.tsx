import { type ReactNode } from 'react'

type Width = 'default' | 'wide' | 'narrow'

const widths: Record<Width, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
}

/** Centered content column with responsive gutters. One source for page rhythm. */
export function Container({
  children,
  width = 'default',
  className = '',
}: {
  children: ReactNode
  width?: Width
  className?: string
}) {
  return (
    <div className={`mx-auto w-full px-6 sm:px-8 lg:px-12 ${widths[width]} ${className}`}>
      {children}
    </div>
  )
}
