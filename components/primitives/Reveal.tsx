'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { revealVariants, staggerContainer } from '@/lib/motion'

/**
 * Reveals children on scroll-into-view (fade + slight rise). Reduced-motion
 * renders fully visible immediately — degrade gracefully, never blank.
 */
export function Reveal({
  children,
  className = '',
  as = 'div',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'section'
  delay?: number
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as]

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Staggered group — direct <Reveal> or motion children animate in sequence.
 * Use for card grids / stat rows.
 */
export function RevealGroup({
  children,
  className = '',
  stagger = 0.06,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  stagger?: number
  as?: 'div' | 'ul' | 'ol'
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as]

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={className}
      variants={staggerContainer(stagger)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
    >
      {children}
    </MotionTag>
  )
}

/** A single item inside a RevealGroup (inherits the parent's stagger). */
export function RevealItem({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as]

  if (reduce) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag className={className} variants={revealVariants}>
      {children}
    </MotionTag>
  )
}
