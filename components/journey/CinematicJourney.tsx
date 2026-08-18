'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import {
  SceneActiveContext,
  SceneAdvanceContext,
  SceneProgressContext,
  ScenePagingContext,
} from './sceneActive'
import { VH_PER_SCENE, dwellEnd } from './timing'
import { BackgroundShapes } from '@/components/media/BackgroundShapes'
import { Backdrop, type BackdropVariant } from '@/components/media/Backdrop'

export type Dir = 'start' | 'right' | 'left' | 'up' | 'down' | 'in'

export interface Scene {
  id: string
  dir: Dir
  node: ReactNode
  /** The room's environment, rendered behind its content. */
  setting?: ReactNode
  /** Which side of the front door this room is on. Defaults to inside. */
  backdrop?: BackdropVariant
  /**
   * How much of the scroll track this room claims, relative to the others.
   * Defaults to 1.
   *
   * Rooms used to share the track equally, which meant a room that pages
   * through seven pieces had exactly as much scrolling as one that says a
   * single sentence — so paging raced and read as the page skipping to the
   * next section instead of moving through the work.
   */
  weight?: number
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

  // Each room's slice of the track, weighted. `starts[i]`/`spans[i]` are
  // fractions of total scroll progress, so a heavier room simply owns more of
  // it and every keyframe below is expressed against its own slice.
  const weights = scenes.map((s) => s.weight ?? 1)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const spans = weights.map((w) => w / totalWeight)
  const starts: number[] = []
  spans.reduce((acc, span) => {
    starts.push(acc)
    return acc + span
  }, 0)

  // One unit of weight, in progress terms. A camera move costs the same number
  // of these wherever it happens, so a heavy room spends its extra weight
  // standing still rather than travelling more slowly (see timing.ts).
  const unit = 1 / totalWeight
  const dwellEnds = starts.map((s, i) => dwellEnd(i, s, spans[i]!, unit))

  // Camera keyframes: hold at each cell (dwell), then move to the next.
  const ins: number[] = []
  const xs: number[] = []
  const ys: number[] = []
  cells.forEach((c, i) => {
    ins.push(starts[i]!, dwellEnds[i]!)
    xs.push(-c.x * 100, -c.x * 100)
    ys.push(-c.y * 100, -c.y * 100)
  })
  ins.push(1)
  xs.push(-cells[n - 1]!.x * 100)
  ys.push(-cells[n - 1]!.y * 100)

  /**
   * Scroll to a point on this track, as a fraction of the whole. Rooms use it
   * to walk the reader on: clicking the front door puts you where the wheel
   * would have, so the camera plays the same move.
   */
  const scrollToProgress = useCallback((p: number) => {
    const el = ref.current
    if (!el) return
    const range = el.offsetHeight - window.innerHeight
    window.scrollTo(0, el.offsetTop + p * range)
  }, [])

  const { scrollYProgress } = useScroll({ target: ref })
  const camX = useTransform(scrollYProgress, ins, xs)
  const camY = useTransform(scrollYProgress, ins, ys)
  const transform = useMotionTemplate`translate3d(${camX}vw, ${camY}vh, 0)`
  // Which scene is centered. Must match the camera's 1/n spacing (NOT 1/(n-1)),
  // or the active flag won't line up with the scene on screen — which also
  // breaks re-triggering the scene's animations when you scroll back to it.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    // Which slice v falls in. Uniform 1/n arithmetic would put the active flag
    // on the wrong room the moment any room is weighted.
    let i = 0
    while (i < n - 1 && v >= starts[i + 1]!) i += 1
    setActive(i)
  })

  // Fallback: stacked full-height sections (also the SSR / no-JS output).
  if (!horizontal) {
    return (
      <div id="top">
        {scenes.map((s) => (
          <StackedScene key={s.id} scene={s} />
        ))}
      </div>
    )
  }

  const nextDir = scenes[active + 1]?.dir

  return (
    <section
      ref={ref}
      id="top"
      style={{ height: `${totalWeight * VH_PER_SCENE}vh` }}
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
              backdrop={s.backdrop}
              // Panel i starts arriving when panel i-1 stops dwelling, so this
              // reads the previous room's slice, not this one's.
              arriveStart={i === 0 ? -spans[0]! : dwellEnds[i - 1]!}
              arriveEnd={starts[i]!}
              segStart={starts[i]!}
              segEnd={starts[i]! + spans[i]!}
              dwellEnd={dwellEnds[i]!}
              progress={scrollYProgress}
              reduce={!!reduce}
              // A nudge past the next room's start, so it has arrived and
              // settled rather than landing on the exact frame it appears.
              advance={
                i + 1 < n
                  ? () => scrollToProgress(starts[i + 1]! + 0.15 * spans[i + 1]!)
                  : null
              }
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
                i === active ? 'bg-accent' : 'bg-fg/25'
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

/**
 * One room in the stacked layout — mobile, and the reduced-motion and no-JS
 * output.
 *
 * There is no camera here, but the rooms' scenery does not actually need one:
 * it only needs to know how far you have scrolled through THIS room. So each
 * section measures its own pass and publishes it on the same context the
 * camera path uses, and a room like the entrance gets its door approaching and
 * swinging on mobile exactly as it does on desktop.
 *
 * The offsets run from "this section's top reaches the top of the viewport" to
 * "its bottom does" — one viewport of scrolling, which is the same span a
 * scene owns on the camera track.
 *
 * Reduced motion still gets stillness: every consumer checks that itself, so
 * publishing progress here costs those users nothing.
 */
function StackedScene({ scene }: { scene: Scene }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // No camera here, so "on to the next room" is simply the next section. Read
  // off the DOM rather than threaded through as an index: the sections are
  // siblings, and the last one correctly has no next.
  const [canAdvance, setCanAdvance] = useState(false)
  useEffect(() => {
    setCanAdvance(!!ref.current?.nextElementSibling)
  }, [])
  const advance = useCallback(() => {
    const next = ref.current?.nextElementSibling as HTMLElement | null
    if (next) window.scrollTo(0, next.offsetTop)
  }, [])

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-surface py-24"
      aria-label={scene.id}
    >
      <SceneAdvanceContext.Provider value={canAdvance ? advance : null}>
        <SceneProgressContext.Provider value={scrollYProgress}>
          {/* No camera here, so there is no transition to keep clear of:
              paging gets the section's whole pass. */}
          <ScenePagingContext.Provider value={scrollYProgress}>
            <Backdrop variant={scene.backdrop} />
            {scene.setting ?? <BackgroundShapes />}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12">
              {scene.node}
            </div>
          </ScenePagingContext.Provider>
        </SceneProgressContext.Provider>
      </SceneAdvanceContext.Provider>
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
  backdrop,
  arriveStart,
  arriveEnd,
  segStart,
  segEnd,
  dwellEnd,
  progress,
  reduce,
  advance,
  children,
}: {
  x: number
  y: number
  z: number
  isActive: boolean
  zoom: boolean
  setting?: ReactNode
  backdrop?: BackdropVariant
  arriveStart: number
  arriveEnd: number
  segStart: number
  segEnd: number
  dwellEnd: number
  progress: MotionValue<number>
  reduce: boolean
  advance: (() => void) | null
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

  // 0 -> 1 across the part of the slice where the camera is parked, for rooms
  // that page through their content. Reaching 1 before the camera leaves is the
  // whole point: the last piece is on the wall while you walk out of the room.
  const scenePaging = useTransform(progress, [segStart, dwellEnd], [0, 1], { clamp: true })

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
      {/* The setting is inside the providers, not beside them. It used to sit
          outside, which meant a room's scenery could not read the scene at
          all — and the window in the first room is scenery that has to know
          where "on to the next room" is. */}
      <SceneActiveContext.Provider value={isActive}>
        <SceneAdvanceContext.Provider value={advance}>
          <SceneProgressContext.Provider value={sceneProgress}>
            <ScenePagingContext.Provider value={scenePaging}>
              <Backdrop variant={backdrop} />
              {setting ?? <BackgroundShapes />}
              {/* The scene's own content animates on arrival via SceneActiveContext. */}
              <div key={enterKey} className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8 lg:px-12">
                {children}
              </div>
            </ScenePagingContext.Provider>
          </SceneProgressContext.Provider>
        </SceneAdvanceContext.Provider>
      </SceneActiveContext.Provider>
    </motion.div>
  )
}
