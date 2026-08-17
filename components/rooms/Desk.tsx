'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent } from 'framer-motion'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'
import type { Project } from '@/content/types'
import { Room } from './Room'
import { StickyNote, tiltForIndex } from './StickyNote'
import { RevealOnActive, useSceneActive, useSceneProgress } from '@/components/journey/sceneActive'

/** Everything not hung on the wall — the overflow, not the exhibition. */
const onDesk = projects.filter((p) => !FEATURED.includes(p.slug as never))

/** Notes per page inside the fixed-height camera panel — one tidy row. */
const PAGE_SIZE = 5
const pages: Project[][] = []
for (let i = 0; i < onDesk.length; i += PAGE_SIZE) pages.push(onDesk.slice(i, i + PAGE_SIZE))

/** A desk surface and a lamp pool of accent light. Decorative only. */
export function DeskSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-surface-raised opacity-60" />
      <div className="absolute left-1/2 top-[6%] h-[58vh] w-[46vw] min-w-[280px] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.12] blur-3xl" />
    </div>
  )
}

function NoteGrid({ notes }: { notes: Project[] }) {
  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {notes.map((p, i) => (
        <li key={p.slug}>
          <StickyNote project={p} tilt={tiltForIndex(i)} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Every note pinned at once — the plain-flow fallback used on mobile, under
 * reduced motion, and with JS off. The room simply grows to fit them.
 */
function DeskStack() {
  return (
    <RevealOnActive index={1}>
      <div className="mt-10">
        <NoteGrid notes={onDesk} />
      </div>
    </RevealOnActive>
  )
}

/**
 * Ten notes is too many to pin up inside one fixed-height camera panel at a
 * readable size, so the desk is dealt out a row at a time as you scroll
 * through the room's own slice of the track (see useSceneProgress) — the same
 * fix as the gallery wall next door, and for the same reason: the panel is
 * exactly one viewport tall and nothing here may be clipped or scrolled to see.
 */
function DeskPager() {
  const progress = useSceneProgress()
  const n = pages.length
  const [page, setPage] = useState(0)

  useMotionValueEvent(progress!, 'change', (v) => {
    setPage(Math.min(n - 1, Math.max(0, Math.floor(v * n))))
  })

  return (
    <div className="mt-10">
      <div className="relative min-h-[26vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <NoteGrid notes={pages[page]!} />
          </motion.div>
        </AnimatePresence>
      </div>
      {n > 1 && (
        <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === page ? 'bg-accent' : 'bg-rule'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DeskRoom() {
  // See Floor.tsx: only the fixed-height camera panel provides a non-null
  // SceneActiveContext, and only there does content taller than one viewport
  // get clipped rather than simply growing the page.
  const inPanel = useSceneActive() !== null

  return (
    <Room className="mx-auto max-w-6xl">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.desk.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.desk.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans leading-relaxed text-fg-muted">{rooms.desk.lede}</p>
      </RevealOnActive>

      {inPanel ? <DeskPager /> : <DeskStack />}
    </Room>
  )
}
