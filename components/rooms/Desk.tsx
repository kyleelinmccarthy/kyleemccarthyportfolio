'use client'

import { useState } from 'react'
import { motion, useReducedMotion, useTransform, type MotionValue } from 'framer-motion'
import type { ReactNode } from 'react'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'
import type { Project } from '@/content/types'
import { Room } from './Room'
import { StickyNote, tiltForIndex } from './StickyNote'
import { RevealOnActive, useScenePaging } from '@/components/journey/sceneActive'
import { ProjectPages } from '@/components/media/ProjectPages'
import { Modal, useModal } from '@/components/primitives/Modal'

/**
 * The professional work that isn't hung on the wall — the overflow, not the
 * exhibition.
 *
 * Personal builds are excluded on purpose. This room sits between the gallery
 * and the way out, on the working side of the house; the after-hours projects
 * have their own room at the back and were being shown twice.
 */
const onDesk = projects.filter((p) => !p.isPersonal && !FEATURED.includes(p.slug as never))

/** A desk surface and a lamp pool of accent light. Decorative only. */
export function DeskSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The desk surface the notes sit on. A flat slab with a hard top edge
          used to be fine when the room behind it was one colour; against the
          study photograph it cut the room in half, so it fades in instead. */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-transparent via-surface-raised/40 to-surface-raised/70" />
      <div className="absolute left-1/2 top-[6%] h-[58vh] w-[46vw] min-w-[280px] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.12] blur-3xl" />
    </div>
  )
}

/**
 * `offset` is the note's position in the whole deck, not on this page, so the
 * colours keep walking across a page turn instead of restarting at yellow.
 */
/**
 * Every note on the desk at once.
 *
 * This used to deal them out five at a time and page through them on scroll,
 * which was a fix for the gallery's problem applied to a room that never had
 * it: ten notes fit on one desk at a readable size. Paging them meant a second
 * thing to scroll through and a second thing to fight the page scroll, for
 * nothing. `offset` is gone with it — the colours just walk the list.
 */
function NoteGrid() {
  const { ref: dialogRef, open: show } = useModal()
  const [openIndex, setOpenIndex] = useState(0)
  const current = onDesk[openIndex]!

  return (
    <>
      <ul aria-label={rooms.desk.heading} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {onDesk.map((p, i) => (
          <li key={p.slug}>
            <StickyNote
              project={p}
              tilt={tiltForIndex(i)}
              index={i}
              // Only offered where there is something to show. An internal
              // platform has no public URL, but Paragon has screenshots — and
              // a note with pictures behind it that you cannot open is a note
              // pretending to be a card.
              onOpen={
                p.media
                  ? (trigger) => {
                      setOpenIndex(i)
                      show(trigger)
                    }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
      <Modal dialogRef={dialogRef} label={current.name}>
        <ProjectPages project={current} />
      </Modal>
    </>
  )
}

/**
 * Leaning in over the desk.
 *
 * You come into this room through a door (the scene's 'in' direction), and
 * then you are standing at a desk — so the notes come up to meet you as you
 * read them, and settle back as you leave. Small: 1.0 to 1.06 is the
 * difference between "I am looking at this" and a zoom that makes the room
 * lurch.
 */
function LeaningIn({ paging, children }: { paging: MotionValue<number>; children: ReactNode }) {
  const scale = useTransform(paging, [0, 1], [1, 1.06])
  return <motion.div style={{ scale, transformOrigin: '50% 40%' }}>{children}</motion.div>
}

function DeskSurface({ children }: { children: ReactNode }) {
  // Split in two so the hooks are unconditional: off the journey there is no
  // scene progress to read, and reduced motion asks for none of this.
  const paging = useScenePaging()
  const reduce = useReducedMotion()
  if (!paging || reduce) return <>{children}</>
  return <LeaningIn paging={paging}>{children}</LeaningIn>
}

export function DeskRoom() {
  return (
    <Room className="mx-auto max-w-6xl">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.desk.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.desk.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans leading-relaxed text-fg-muted">{rooms.desk.lede}</p>
      </RevealOnActive>

      <RevealOnActive index={1}>
        <DeskSurface>
          <div className="mt-8">
            <NoteGrid />
          </div>
        </DeskSurface>
      </RevealOnActive>
    </Room>
  )
}
