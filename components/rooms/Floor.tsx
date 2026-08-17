'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent } from 'framer-motion'
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

/** Gallery lighting: a soft pool of accent behind each piece. Decorative only. */
export function FloorSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute top-[8%] h-[46vh] w-[26vw] min-w-[220px] rounded-[45%] bg-accent opacity-[0.07] blur-3xl"
          style={{ left: `${(i / pieces.length) * 100}%` }}
        />
      ))}
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
    <RevealOnActive index={1}>
      <div className="mt-10 grid gap-x-10 gap-y-16 lg:grid-cols-2">
        {pieces.map(({ project, study }) => (
          <FloorPiece key={project.slug} project={project} study={study} />
        ))}
      </div>
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
    <div className="mt-8">
      <div className="relative min-h-[48vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.project.slug}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <FloorPiece project={current.project} study={current.study} layout="feature" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-2">
        {pieces.map((p, i) => (
          <span
            key={p.project.slug}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? 'bg-accent' : 'bg-rule'}`}
          />
        ))}
      </div>
      <p aria-hidden="true" className="mt-2 text-center font-sans text-xs text-fg-muted">
        {active + 1} / {n}
      </p>
    </div>
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
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.floor.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.floor.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans leading-relaxed text-fg-muted">{rooms.floor.lede}</p>
      </RevealOnActive>

      {inPanel ? <FloorWall /> : <FloorStack />}
    </Room>
  )
}
