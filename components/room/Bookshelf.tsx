'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Modal, useModal } from '@/components/primitives/Modal'

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

/** One book: what is stamped on the spine, and what is inside it. */
export interface Volume {
  key: string
  /** The spine text, and the dialog's accessible name. */
  title: string
  detail: ReactNode
}

/**
 * A shelf of books you pull out.
 *
 * The library was a column of cards on a page while the rest of the site was a
 * building you walk through — which had the fun part of the site being the
 * least fun thing in it. A shelf is the library's version of the desk's sticky
 * notes: the content is identical, the object is real. It holds the after-hours
 * projects on one shelf and the art, a volume per medium, on another.
 *
 * A spine is a real <button> that opens a native <dialog>, so focus trapping,
 * Esc-to-close and an inert background all come from the platform. Only one
 * dialog is mounted, holding whichever book is open, so the markup does not
 * carry a modal per book.
 */
export function Bookshelf({ volumes, hint }: { volumes: Volume[]; hint?: string }) {
  const { ref: dialogRef, open: showBook } = useModal()
  const [open, setOpen] = useState(0)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setOpen((i) => (i + 1) % volumes.length)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setOpen((i) => (i - 1 + volumes.length) % volumes.length)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [dialogRef, volumes.length])

  if (!volumes.length) return null
  const current = volumes[open]!

  return (
    <>
      {hint && <p className="font-sans text-sm italic text-fg-muted">{hint}</p>}

      <div className={hint ? 'mt-4' : ''}>
        <ul className="flex flex-wrap items-end gap-1.5">
          {volumes.map((v, i) => (
            <li key={v.key}>
              <button
                type="button"
                onClick={(e) => {
                  setOpen(i)
                  showBook(e.currentTarget)
                }}
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
                  {v.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {/* The shelf they are standing on. */}
        <div aria-hidden="true" className="h-2 rounded-sm bg-surface-raised shadow-md ring-1 ring-rule" />
        <div aria-hidden="true" className="mx-2 h-1.5 rounded-b-sm bg-surface-raised opacity-60" />
      </div>

      <Modal dialogRef={dialogRef} label={current.title}>
        {current.detail}
        <div className="mt-6 text-right">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full bg-fill px-4 py-1.5 font-sans text-sm font-semibold text-fill-fg"
          >
            Put it back
          </button>
        </div>
      </Modal>
    </>
  )
}
