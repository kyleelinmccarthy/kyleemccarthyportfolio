'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import { SceneActiveContext, SceneProgressContext } from './sceneActive'
import { VH_PER_SCENE, holdFor } from './timing'
import { BackgroundShapes } from '@/components/media/BackgroundShapes'
import { Backdrop } from '@/components/media/Backdrop'

export type Dir = 'start' | 'right' | 'left' | 'up' | 'down' | 'in'

export interface Scene {
  id: string
  dir: Dir
  node: ReactNode
  /** The room's environment, rendered behind its content. */
  setting?: ReactNode
}

/**
 * The cue tells the reader what to DO, and the answer is always the same:
 * scroll down. It used to show the camera's direction instead, which meant the
 * first room — where the camera climbs the stairs — displayed an up arrow next
 * to the word "scroll" and told people to do the opposite of the right thing.
 */
const SCROLL_GLYPH = '↓'

/** Lay scenes out on a 2D grid following each scene's entry direction. */
export function layout(scenes: Scene[]) {
  let x = 0
  let y = 0
  return scenes.map((s, i) => {
    if (i > 0) {
      if (s.dir === 'right') x += 1
      else if (s.dir === 'left') x -= 1
      else if (s.dir === 'down') y += 1
      else if (s.dir === 'up') y -= 1
      // 'in' keeps the same cell (zoom/crossfade over the previous scene)
    }
    return { x, y, zoom: s.dir === 'in' }
  })
}

export function CinematicJourney({ scenes }: { scenes: Scene[] }) {
  const n = scenes.length
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [horizontal, setHorizontal] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setHorizontal(mq.matches && !reduce)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [reduce])

  const cells = layout(scenes)
  const seg = n > 1 ? 1 / n : 1

  // Camera keyframes: hold at each cell (dwell), then move to the next.
  const ins: number[] = []
  const xs: number[] = []
  const ys: number[] = []
  cells.forEach((c, i) => {
    ins.push(i * seg, i * seg + holdFor(i) * seg)
    xs.push(-c.x * 100, -c.x * 100)
    ys.push(-c.y * 100, -c.y * 100)
  })
  ins.push(1)
  xs.push(-cells[n - 1]!.x * 100)
  ys.push(-cells[n - 1]!.y * 100)

  const { scrollYProgress } = useScroll({ target: ref })
  const camX = useTransform(scrollYProgress, ins, xs)
  const camY = useTransform(scrollYProgress, ins, ys)
  const transform = useMotionTemplate`translate3d(${camX}vw, ${camY}vh, 0)`
  // Which scene is centered. Must match the camera's 1/n spacing (NOT 1/(n-1)),
  // or the active flag won't line up with the scene on screen — which also
  // breaks re-triggering the scene's animations when you scroll back to it.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.floor(v * n))))
  })

  // Fallback: stacked full-height sections (also the SSR / no-JS output).
  if (!horizontal) {
    return (
      <div id="top">
        {scenes.map((s) => (
          <section
            key={s.id}
            className="relative flex min-h-[100svh] items-center overflow-hidden bg-surface py-24"
            aria-label={s.id}
          >
            <Backdrop />
            {s.setting ?? <BackgroundShapes />}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12">{s.node}</div>
          </section>
        ))}
      </div>
    )
  }

  const nextDir = scenes[active + 1]?.dir

  return (
    <section
      ref={ref}
      id="top"
      style={{ height: `${n * VH_PER_SCENE}vh` }}
      aria-label="Scroll journey"
      className="relative bg-surface"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ transform }}>
          {scenes.map((s, i) => (
            <Panel
              key={s.id}
              x={cells[i]!.x}
              y={cells[i]!.y}
              z={i}
              isActive={i === active}
              zoom={cells[i]!.zoom}
              setting={s.setting}
              // Panel i starts arriving when panel i-1 stops dwelling — so this
              // reads the *previous* scene's hold, which differs for scene 0.
              arriveStart={(i - 1 + holdFor(i - 1)) * seg}
              arriveEnd={i * seg}
              segStart={i * seg}
              segEnd={(i + 1) * seg}
              progress={scrollYProgress}
              reduce={!!reduce}
            >
              {s.node}
            </Panel>
          ))}
        </motion.div>

        {/* Progress dots */}
        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 gap-2.5" aria-hidden="true">
          {scenes.map((s, i) => (
            <span
              key={s.id}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                i === active ? 'bg-accent' : 'bg-rule'
              }`}
            />
          ))}
        </div>

        {/* Directional scroll cue (points where the next scroll takes you) */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-6 right-8 z-20 flex items-center gap-2 font-sans text-label uppercase text-fg-muted"
          animate={{ opacity: nextDir ? 0.9 : 0 }}
          transition={{ duration: 0.3 }}
        >
          scroll
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {SCROLL_GLYPH}
          </motion.span>
        </motion.div>
      </div>
    </section>
  )
}

function Panel({
  x,
  y,
  z,
  isActive,
  zoom,
  setting,
  arriveStart,
  arriveEnd,
  segStart,
  segEnd,
  progress,
  reduce,
  children,
}: {
  x: number
  y: number
  z: number
  isActive: boolean
  zoom: boolean
  setting?: ReactNode
  arriveStart: number
  arriveEnd: number
  segStart: number
  segEnd: number
  progress: MotionValue<number>
  reduce: boolean
  children: ReactNode
}) {
  const a = arriveStart
  const b = Math.max(arriveEnd, arriveStart + 0.0001)

  // 'in' scenes dive in: opaque crossfade + a clear zoom over the prior scene.
  const panelOpacity = useTransform(progress, [a, b], zoom ? [0, 1] : [1, 1])
  // 1.5 rather than 1.3: the two 'in' moves are both thresholds you step
  // through — the front door and the way out — and a shallower zoom read as a
  // crossfade rather than as movement.
  const panelScale = useTransform(progress, [a, b], zoom ? [1.5, 1] : [1, 1])

  // 0 -> 1 across this scene's own slice of the track, so a room can drive its
  // scenery off the scroll (the front door growing as you walk up to it).
  const sceneProgress = useTransform(progress, [segStart, segEnd], [0, 1], { clamp: true })

  // Remount the scene's content each time it becomes active, so every reveal /
  // count-up replays when you scroll back to it (reveals-only scenes like
  // "How I create value" otherwise wouldn't re-fire reliably).
  const [enterKey, setEnterKey] = useState(0)
  const wasActive = useRef(false)
  useEffect(() => {
    if (isActive && !wasActive.current) setEnterKey((k) => k + 1)
    wasActive.current = isActive
  }, [isActive])

  return (
    <motion.div
      className="absolute flex h-[100svh] w-screen items-center overflow-hidden bg-surface"
      style={{
        left: `${x * 100}vw`,
        top: `${y * 100}vh`,
        zIndex: z,
        opacity: reduce ? 1 : panelOpacity,
        scale: reduce ? 1 : panelScale,
        // Only the centered scene is interactive. Without this, an 'in'/zoom
        // scene that shares a grid cell with the scene beneath it sits on top
        // at opacity 0 and still swallows every click (opacity alone doesn't
        // disable pointer events) — which made the Build scene's links dead.
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <Backdrop />
      {setting ?? <BackgroundShapes />}
      {/* The scene's own content animates on arrival via SceneActiveContext. */}
      <SceneActiveContext.Provider value={isActive}>
        <SceneProgressContext.Provider value={sceneProgress}>
        <div key={enterKey} className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12">
          {children}
        </div>
        </SceneProgressContext.Provider>
      </SceneActiveContext.Provider>
    </motion.div>
  )
}
