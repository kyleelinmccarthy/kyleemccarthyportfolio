'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import {
  AnimatePresence,
  motion,
  motionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { FEATURED, caseStudies, type CaseStudy } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import type { Project } from '@/content/types'
import { Room } from './Room'
import { Placard } from './Placard'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'
import { StackChips } from '@/components/primitives/StackChips'
import { RevealOnActive, useSceneActive, useScenePaging } from '@/components/journey/sceneActive'

/** A standing zero, so useTransform can be called unconditionally. */
const MOTION_ZERO = motionValue(0)

/**
 * The seven pieces, joined to their projects at module load. A featured slug
 * with no matching project or case study fails the build rather than
 * rendering a silent hole on the wall.
 */
const pieces: { project: Project; study: CaseStudy }[] = FEATURED.map((slug) => {
  const project = projects.find((p) => p.slug === slug)
  if (!project) throw new Error(`The Floor: no project found for featured slug "${slug}"`)
  const study = caseStudies.find((c) => c.slug === slug)
  if (!study) throw new Error(`The Floor: no case study found for featured slug "${slug}"`)
  return { project, study }
})

/**
 * How far apart the wall segments stand, and how many there are. Depth is in
 * px because that is what a CSS 3D translateZ is in.
 */
const HALL_DEPTH = 460
const HALL_SEGMENTS = [0, 1, 2, 3, 4, 5, 6, 7]

/** One segment of wall, on one side, at one depth down the hall. */
function WallSegment({ side, depth }: { side: -1 | 1; depth: number }) {
  return (
    <span
      // 30vw out and 62 degrees round, not 46 and 74: at the old numbers the
      // walls stood outside the viewport and edge-on to it, so the corridor
      // was mathematically correct and completely invisible.
      className="absolute left-1/2 top-1/2 block h-[62vh] w-[46vw]"
      style={{
        transform: `translate(-50%, -50%) translateX(${side * 38}vw) translateZ(${-depth}px) rotateY(${side * 62}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* The wall itself. */}
      <span className="absolute inset-0 block bg-gradient-to-b from-surface-raised via-surface-raised to-surface opacity-60" />
      {/* A framed piece hung on it, and the picture light above. Both are
          suggestions rather than pictures: this is the hall you are walking
          down, not the work — the work is the piece in the middle of the
          screen. */}
      <span className="absolute left-[18%] top-[26%] block h-[42%] w-[46%] rounded-sm bg-surface ring-2 ring-fill/40" />
      <span className="absolute left-[26%] top-[16%] block h-[7%] w-[30%] rounded-full bg-accent opacity-40 blur-md" />
      {/* Skirting, so the wall meets a floor. */}
      <span className="absolute inset-x-0 bottom-[6%] block h-[2px] bg-fill opacity-35" />
    </span>
  )
}

function Corridor({ z }: { z: MotionValue<number> | number }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: 'preserve-3d', z }}
    >
      {/* Fragments, not wrapper spans. A plain element between the
          preserve-3d container and the segments flattens their 3D — every
          segment then renders at the same size whatever depth it claims to
          stand at, which is a corridor with no depth in it at all. */}
      {HALL_SEGMENTS.map((i) => (
        <Fragment key={i}>
          <WallSegment side={-1} depth={i * HALL_DEPTH} />
          <WallSegment side={1} depth={i * HALL_DEPTH} />
        </Fragment>
      ))}
    </motion.div>
  )
}

/**
 * A hallway you move down, not a picture of one.
 *
 * The first attempt was four flat wedges clipped into trapezoids. It drew a
 * corridor and it moved not at all, so walking the gallery still felt like
 * swapping cards. This is the real thing: wall segments standing at intervals
 * down the z axis inside a perspective, and the whole corridor pulled toward
 * you as you scroll through the room. Segments pass the camera and the next
 * ones arrive — which is what walking down a hall looks like.
 *
 * The travel is tied to the room's dwell, the same value the pieces page on,
 * so the hall and the work move together rather than at odds.
 */
export function FloorSetting() {
  const paging = useScenePaging()
  const reduce = useReducedMotion()
  // Stop one segment short of the end, so you never walk out of the corridor.
  const z = useTransform(paging ?? MOTION_ZERO, [0, 1], [0, HALL_DEPTH * (HALL_SEGMENTS.length - 2)])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: '1100px', perspectiveOrigin: '50% 45%' }}
    >
      {/* The far end of the hall, lit. Sits behind everything, so the corridor
          reads as running toward a light rather than into a wall. */}
      <div className="absolute left-1/2 top-[45%] h-[30vh] w-[22vw] min-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-accent opacity-[0.13] blur-3xl" />

      <Corridor z={reduce || !paging ? HALL_DEPTH : z} />

      {/* Fog: the far end fades into the room's own colour, and the near edges
          darken, which is what stops the segments from looking like flats
          standing in a row. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_0%,transparent_34%,rgb(var(--surface)/0.35)_72%,rgb(var(--surface)/0.6)_100%)]" />
    </div>
  )
}

function FloorPiece({
  project,
  study,
  layout = 'card',
}: {
  project: Project
  study: CaseStudy
  layout?: 'card' | 'feature'
}) {
  const text = (
    <>
      <h3 className="font-serif text-2xl leading-tight text-fg">{project.name}</h3>
      <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.whatItIs}</p>
      <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.problem}</p>
      <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.whyBuiltThisWay}</p>
      <StackChips stack={project.stack} />
      {project.media?.gallery && <Gallery items={project.media.gallery} label={project.name} />}
      <Placard study={study} />
    </>
  )

  if (layout === 'feature') {
    return (
      <article className="grid gap-6 sm:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] sm:items-start sm:gap-10">
        <ProjectVisual media={project.media} name={project.name} />
        <div className="max-w-2xl">{text}</div>
      </article>
    )
  }

  return (
    <article>
      <ProjectVisual media={project.media} name={project.name} />
      <div className="mt-4">{text}</div>
    </article>
  )
}

/**
 * Every piece hung and readable at once — the plain-flow fallback used
 * on mobile, under reduced motion, and with JS off. Nothing here is height
 * constrained: the room simply grows to fit its content, the way the rest of
 * the page already does outside the fixed-height camera panel.
 */
function FloorStack() {
  return (
    <RevealOnActive>
      <div className="grid gap-x-10 gap-y-16 lg:grid-cols-2">
        {pieces.map(({ project, study }) => (
          <FloorPiece key={project.slug} project={project} study={study} />
        ))}
      </div>
      <LibraryNote className="mt-12" />
    </RevealOnActive>
  )
}

/**
 * The gallery wall as it plays inside the scroll-driven camera: one piece on
 * the wall at a time, walked past as you scroll through the room's own
 * slice of the track (see useScenePaging). This is what keeps the room to
 * one viewport tall without a scrollbar or clipped content — the fixed-height
 * camera panel never has to hold more than a single piece's worth of copy.
 */
function FloorWall() {
  const progress = useScenePaging()
  const n = pieces.length
  const [active, setActive] = useState(0)

  useMotionValueEvent(progress!, 'change', (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.floor(v * n))))
  })

  const current = pieces[active]!

  return (
    <div>
      <div className="relative min-h-[48vh]">
        <AnimatePresence mode="wait">
          {/* The hall itself carries the sense of travel now, so the piece
              only needs to arrive: a short slide and a slight scale, rather
              than a long swipe competing with the corridor behind it. */}
          <motion.div
            key={current.project.slug}
            initial={{ opacity: 0, x: 44, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -44, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <FloorPiece project={current.project} study={current.study} layout="feature" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-2">
        {pieces.map((p, i) => (
          <span
            key={p.project.slug}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? 'bg-accent' : 'bg-fg/25'}`}
          />
        ))}
      </div>
      <p aria-hidden="true" className="mt-2 text-center font-sans text-xs text-fg-muted">
        {active + 1} / {n}
      </p>
      <LibraryNote className="mt-4 text-center" />
    </div>
  )
}

/**
 * The pointer that replaced the three personal pieces on this wall. They were
 * hanging here and standing on their own shelf in the library at the same
 * time; this says where they went, so the gallery doesn't read as the whole of
 * what she makes.
 */
function LibraryNote({ className = '' }: { className?: string }) {
  return (
    <p className={`font-sans text-sm text-fg-muted ${className}`}>
      <Link href="/room" className="text-accent underline-offset-4 hover:underline">
        {rooms.floor.libraryNote}
      </Link>
    </p>
  )
}

export function FloorRoom() {
  // SceneActiveContext is only ever a boolean (not null) inside the
  // fixed-height camera panel — the stacked fallback and standalone pages
  // never provide it. That is exactly the case where content taller than one
  // viewport would otherwise get clipped, so it is the signal used here to
  // choose between the two layouts.
  const inPanel = useSceneActive() !== null

  return (
    <Room className="mx-auto max-w-6xl">
      {/* No visible heading: three lines announcing that work is coming, above
          the work. The name is here for the landmark and for screen readers,
          and the wall speaks for itself. */}
      <h2 className="sr-only">{rooms.floor.label}</h2>
      {inPanel ? <FloorWall /> : <FloorStack />}
    </Room>
  )
}
