'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion, type MotionValue } from 'framer-motion'

/**
 * Whether the enclosing journey scene is currently centered.
 * null = not inside the journey (e.g. a standalone /section page), in which
 * case animated children fall back to normal in-view triggering.
 */
export const SceneActiveContext = createContext<boolean | null>(null)
export function useSceneActive() {
  return useContext(SceneActiveContext)
}

/**
 * How far the reader has scrolled through THIS scene's own slice of the
 * journey, 0 to 1. Lets a room drive its own scenery off the scroll — the
 * front door growing as you approach it, for instance — without needing to
 * know where its slice sits in the whole track.
 *
 * null outside the journey (standalone pages), where there is no camera.
 */
export const SceneProgressContext = createContext<MotionValue<number> | null>(null)
export function useSceneProgress() {
  return useContext(SceneProgressContext)
}

/**
 * The same idea, but 0 to 1 across only the part of the room's slice where the
 * camera is standing still.
 *
 * A room that pages through content — the gallery wall, the desk — has to
 * finish paging before the camera starts travelling to the next room, or the
 * two movements happen at once and the reader cannot tell whether scrolling is
 * walking them along the wall or off to the next room. Scenery that plays
 * *through* the transition (the front door you scroll into) wants
 * useSceneProgress instead.
 *
 * Outside the journey, and in the stacked mobile layout, there is no camera to
 * wait for, so this is the same value as useSceneProgress.
 */
export const ScenePagingContext = createContext<MotionValue<number> | null>(null)
export function useScenePaging() {
  return useContext(ScenePagingContext)
}

/**
 * Walks the reader on to the next room.
 *
 * The journey is driven by scroll, so a room cannot navigate — there is no
 * next page to go to, only a place further down the same track. This scrolls
 * there, which means the camera plays the move exactly as it would if you had
 * turned the wheel yourself. It uses the two-argument scrollTo on purpose:
 * that form honours the page's CSS `scroll-behavior`, so someone who asked for
 * reduced motion gets an instant jump instead of a forced smooth glide.
 *
 * null when there is nowhere further to go — the last room, or a standalone
 * page with no journey around it — so a room can render a plain, unclickable
 * object rather than a control that does nothing.
 */
export const SceneAdvanceContext = createContext<(() => void) | null>(null)
export function useSceneAdvance() {
  return useContext(SceneAdvanceContext)
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
