'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project } from '@/content/types'
import { room } from '@/content/room'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'
import { StackChips } from '@/components/primitives/StackChips'

/**
 * Six cloth bindings. Real book colours rather than tints of the site palette,
 * for the same reason the desk gets real Post-it colours: a bound book is an
 * object being depicted, not a UI surface. They are tokens defined once in
 * globals.css — the same in both themes, because a book does not change colour
 * when you turn the lights on — and every one of them carries --book-foil at
 * 8:1 or better.
 */
const BINDINGS = ['bg-book-1', 'bg-book-2', 'bg-book-3', 'bg-book-4', 'bg-book-5', 'bg-book-6']

/**
 * Spines are not all one width, and the variation is deterministic — a random
 * width would give the server and the client different markup and break
 * hydration. Walking the list also guarantees no two neighbours match.
 */
const WIDTHS = ['w-[3.25rem]', 'w-[4rem]', 'w-[3.5rem]', 'w-[4.5rem]', 'w-[3.75rem]']
const HEIGHTS = ['h-[15rem]', 'h-[16.5rem]', 'h-[15.75rem]', 'h-[17rem]', 'h-[16rem]']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

/**
 * The after-hours projects, shelved.
 *
 * The library was a column of cards on a page while the rest of the site was a
 * building you walk through — which had the fun part of the site being the
 * least fun thing in it. A shelf of books you pull out is the library's version
 * of the desk's sticky notes: the content is identical, the object is real.
 *
 * A spine is a real <button> that opens a native <dialog>, so focus trapping,
 * Esc-to-close and an inert background all come from the platform. Only one
 * dialog is mounted, holding whichever book is open, so the markup does not
 * carry nine copies of a modal.
 */
export function Bookshelf({ projects }: { projects: Project[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(0)

  const pull = useCallback((i: number, trigger: HTMLButtonElement) => {
    setOpen(i)
    // Focus the spine before showModal(). A native dialog restores focus to
    // whatever was document.activeElement when it opened, and Safari has
    // historically not focused buttons on mouse click — without this, where
    // focus lands on close would be browser-dependent. Same fix as Gallery.
    trigger.focus()
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setOpen((i) => (i + 1) % projects.length)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setOpen((i) => (i - 1 + projects.length) % projects.length)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [projects.length])

  if (!projects.length) return null
  const current = projects[open]!

  return (
    <>
      <p className="font-sans text-sm italic text-fg-muted">{room.projects.hint}</p>

      <div className="mt-4">
        <ul className="flex flex-wrap items-end gap-1.5">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={(e) => pull(i, e.currentTarget)}
                className={[
                  'group relative flex items-center justify-center rounded-sm rounded-t-md',
                  'ring-1 ring-black/30 shadow-md shadow-black/30',
                  BINDINGS[i % BINDINGS.length]!,
                  WIDTHS[i % WIDTHS.length]!,
                  HEIGHTS[i % HEIGHTS.length]!,
                  // The pull: the book leans out of the shelf and rises a
                  // little. Origin at the foot so it pivots on the shelf the
                  // way a real one does.
                  'origin-bottom transition-transform duration-200 ease-out motion-reduce:transition-none',
                  'hover:-translate-y-2 hover:-rotate-3 focus-visible:-translate-y-2 focus-visible:-rotate-3',
                  'motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                ].join(' ')}
              >
                {/* Head and tail bands, and a foil rule down each edge. Small
                    things, but they are what stop a coloured rectangle from
                    reading as a coloured rectangle. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 top-3 h-px bg-book-foil opacity-50"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 bottom-3 h-px bg-book-foil opacity-50"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-black opacity-20"
                />
                {/* Bottom-to-top, the way a spine on a shelf is set. */}
                <span
                  className="px-1 text-center font-serif text-sm leading-tight text-book-foil [writing-mode:vertical-rl] [text-orientation:mixed]"
                  style={{ transform: 'rotate(180deg)' }}
                >
                  {p.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {/* The shelf they are standing on. */}
        <div aria-hidden="true" className="h-2 rounded-sm bg-surface-raised shadow-md ring-1 ring-rule" />
        <div aria-hidden="true" className="mx-2 h-1.5 rounded-b-sm bg-surface-raised opacity-60" />
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${current.name} — details`}
        className="max-w-[min(92vw,44rem)] rounded-xl bg-surface-raised p-6 text-fg ring-1 ring-rule backdrop:bg-black/70"
      >
        <ProjectVisual media={current.media} name={current.name} className="mb-5" />
        <h3 className="font-serif text-2xl leading-tight text-fg">{current.name}</h3>
        <p className="mt-1 font-sans text-sm text-fg-muted">{current.descriptor}</p>
        <dl className="mt-4 space-y-3">
          <Field label="Problem">{current.problem}</Field>
          <Field label="What I Built">{current.built}</Field>
          {current.outcome && <Field label="Outcome">{current.outcome}</Field>}
        </dl>
        <StackChips stack={current.stack} />
        {current.media?.gallery && (
          <Gallery items={current.media.gallery} label={current.name} />
        )}
        <div className="mt-6 flex items-center justify-between gap-3">
          {current.liveUrl ? (
            <a
              href={current.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              Visit
              <span aria-hidden="true">↗</span>
              <span className="sr-only">{current.name} (opens in a new tab)</span>
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full bg-accent px-4 py-1.5 font-sans text-sm font-semibold text-fill-fg"
          >
            Put it back
          </button>
        </div>
      </dialog>
    </>
  )
}
