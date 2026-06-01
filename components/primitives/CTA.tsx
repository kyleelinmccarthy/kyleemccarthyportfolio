import { type ReactNode } from 'react'

type Variant = 'primary' | 'secondary'
type Arrow = 'down' | 'right' | 'none'

const base =
  'group inline-flex items-center gap-2 rounded-full px-6 py-3 font-sans text-base font-semibold transition-all duration-200 ease-out focus-visible:outline-none'

const variants: Record<Variant, string> = {
  // theme-aware terracotta fill + cream label = 4.86:1 (AA) in both themes
  primary: 'bg-fill text-fill-fg hover:-translate-y-0.5 hover:brightness-110',
  secondary: 'text-fg ring-1 ring-rule hover:ring-accent hover:text-accent',
}

const glyph: Record<Exclude<Arrow, 'none'>, string> = { down: '↓', right: '→' }
const nudge: Record<Exclude<Arrow, 'none'>, string> = {
  down: 'group-hover:translate-y-0.5',
  right: 'group-hover:translate-x-0.5',
}

/** Shared call-to-action link with an arrow micro-interaction. */
export function CTA({
  href,
  children,
  variant = 'primary',
  arrow = 'down',
  className = '',
  ...rest
}: {
  href: string
  children: ReactNode
  variant?: Variant
  arrow?: Arrow
  className?: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {arrow !== 'none' && <span aria-hidden="true">{glyph[arrow]}</span>}
      <span className={`transition-transform duration-200 ease-out ${arrow !== 'none' ? nudge[arrow] : ''}`}>
        {children}
      </span>
    </a>
  )
}
