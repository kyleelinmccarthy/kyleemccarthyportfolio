'use client'

import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'
import type { Project } from '@/content/types'
import { Room } from './Room'
import { StickyNote, tiltForIndex } from './StickyNote'
import { RevealOnActive } from '@/components/journey/sceneActive'

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
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {onDesk.map((p, i) => (
        <li key={p.slug}>
          <StickyNote project={p} tilt={tiltForIndex(i)} index={i} />
        </li>
      ))}
    </ul>
  )
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
        <div className="mt-8">
          <NoteGrid />
        </div>
      </RevealOnActive>
    </Room>
  )
}
