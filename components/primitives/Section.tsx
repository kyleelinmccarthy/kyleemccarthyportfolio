import { type ReactNode } from 'react'
import { Container } from './Container'
import { BackgroundShapes } from '@/components/media/BackgroundShapes'

/**
 * A page section with an anchor id and optional eyebrow label + heading.
 * Sections receive typed data and render — they never own content (SRP).
 */
export function Section({
  id,
  label,
  heading,
  headingId,
  children,
  className = '',
  containerWidth = 'default',
  as: Tag = 'section',
  shapes = false,
}: {
  id: string
  label?: string
  heading?: ReactNode
  headingId?: string
  children: ReactNode
  className?: string
  containerWidth?: 'default' | 'wide' | 'narrow'
  as?: 'section' | 'div'
  shapes?: boolean
}) {
  const labelledBy = headingId ?? (heading ? `${id}-heading` : undefined)
  return (
    <Tag
      id={id}
      aria-labelledby={heading ? labelledBy : undefined}
      className={`relative scroll-mt-20 py-20 sm:py-28 lg:py-32 ${shapes ? 'overflow-hidden' : ''} ${className}`}
    >
      {shapes && <BackgroundShapes />}
      <Container width={containerWidth} className={shapes ? 'relative z-10' : ''}>
        {(label || heading) && (
          <header className="mb-10 sm:mb-14">
            {label && (
              <p className="font-sans text-label uppercase text-accent">{label}</p>
            )}
            {heading && (
              <h2
                id={labelledBy}
                className="mt-3 font-serif text-fluid-h2 text-fg"
              >
                {heading}
              </h2>
            )}
          </header>
        )}
        {children}
      </Container>
    </Tag>
  )
}
