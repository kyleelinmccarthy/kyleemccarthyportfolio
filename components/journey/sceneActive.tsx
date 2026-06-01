'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/**
 * Whether the enclosing journey scene is currently centered.
 * null = not inside the journey (e.g. a standalone /section page), in which
 * case animated children fall back to normal in-view triggering.
 */
export const SceneActiveContext = createContext<boolean | null>(null)
export function useSceneActive() {
  return useContext(SceneActiveContext)
}

/** Rise + fade a block in when its scene becomes active (or scrolls into view). */
export function RevealOnActive({
  children,
  index = 0,
  className = '',
}: {
  children: ReactNode
  index?: number
  className?: string
}) {
  const sceneActive = useSceneActive()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-12%' })
  const run = sceneActive === null ? inView : sceneActive

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={run ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
    >
      {children}
    </motion.div>
  )
}
