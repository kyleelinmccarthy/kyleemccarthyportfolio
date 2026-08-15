'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { MediaItem } from '@/content/types'

/**
 * Thumbnail strip plus a native <dialog> lightbox. Native dialog gives focus
 * trapping, Esc-to-close and an inert background for free — the three things
 * hand-rolled modals get wrong.
 */
export function Gallery({ items, label }: { items: MediaItem[]; label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)

  const open = useCallback((i: number, trigger: HTMLButtonElement) => {
    setIndex(i)
    // Focus the invoking thumbnail explicitly before showModal(). Native
    // <dialog> restores focus to whatever was document.activeElement when
    // showModal() was called — that's the click target in Chrome/Firefox,
    // but Safari has historically not focused buttons on mouse click, so
    // without this the post-close focus target would be browser-dependent.
    trigger.focus()
    dialogRef.current?.showModal()
  }, [])

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + items.length) % items.length),
    [items.length]
  )

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [step])

  if (!items.length) return null
  const current = items[index]!

  return (
    <>
      <ul className="mt-4 flex flex-wrap gap-3">
        {items.map((m, i) => (
          <li key={m.src}>
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              className="relative block h-20 w-32 overflow-hidden rounded-lg ring-1 ring-rule transition-shadow hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Image src={m.src} alt={m.alt} fill sizes="8rem" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`${label} gallery`}
        className="backdrop:bg-black/70 max-w-[min(90vw,72rem)] rounded-xl bg-surface-raised p-4 text-fg ring-1 ring-rule"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
          <Image src={current.src} alt={current.alt} fill sizes="90vw" className="object-contain" />
        </div>
        <p className="mt-3 font-sans text-sm text-fg-muted">{current.caption ?? current.alt}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => step(-1)} className="rounded-full px-3 py-1.5 font-sans text-sm ring-1 ring-rule hover:text-accent hover:ring-accent">
              ← Previous
            </button>
            <button type="button" onClick={() => step(1)} className="rounded-full px-3 py-1.5 font-sans text-sm ring-1 ring-rule hover:text-accent hover:ring-accent">
              Next →
            </button>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full bg-accent px-4 py-1.5 font-sans text-sm font-semibold text-fill-fg">
            Close
          </button>
        </div>
      </dialog>
    </>
  )
}
