'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
// From `sheet`, not `gestures`: nothing here may bring three.js onto the page (see lib/world/sheet.ts).
import { SHEET_DRAG, SHEET_FULL, SHEET_HANDLE_NAME, sheetAfterDrag, type SheetState } from '@/lib/world/sheet'
import { placeSheet } from './sheetEdge'

/** The id of the panel's scrolling body, which the sheet's handle controls. */
const BODY_ID = 'place-panel-body'

/** Whether focus came by the keyboard (the browser shows its ring), not by a tap. False where the browser cannot say. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return false
  }
}

/**
 * The place's panel as a sheet that can open and close (`PanelShell` fills it).
 * On a phone, with JavaScript, it opens to a peek (`.place-sheet` in
 * globals.css), and its handle, pressed or dragged, opens it in full and closes
 * it again; all of it stays in the page either way. It tells the camera where
 * its top edge is (`placeSheet`), so the landmark stays in the middle of what
 * it leaves. `placeId` changing opens the next place at its peek.
 */
export function PlaceSheet({
  placeId,
  color,
  className,
  header,
  children,
}: {
  placeId: string
  color: string
  className: string
  header: ReactNode
  children: ReactNode
}) {
  const [sheet, setSheet] = useState<SheetState>('peek')
  const article = useRef<HTMLElement>(null)
  // A drag on the handle under way: where it began and the sheet's height then. And whether the press that ends it was a drag.
  const drag = useRef<{ id: number; y: number; height: number; moved: number } | null>(null)
  const dragged = useRef(false)

  // Every place opens at its peek.
  useEffect(() => setSheet('peek'), [placeId])

  // The camera follows the sheet's top edge as it moves, and lets go of it when the panel goes.
  useLayoutEffect(() => {
    const el = article.current
    if (!el) return
    const publish = () => placeSheet.set(el.getBoundingClientRect().top)
    publish()
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    resized?.observe(el)
    window.addEventListener('resize', publish)
    return () => {
      resized?.disconnect()
      window.removeEventListener('resize', publish)
      placeSheet.set(null)
    }
  }, [])

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    const el = article.current
    if (!el) return
    drag.current = { id: e.pointerId, y: e.clientY, height: el.getBoundingClientRect().height, moved: 0 }
    dragged.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const now = drag.current
    const el = article.current
    if (!now || !el || e.pointerId !== now.id) return
    now.moved = e.clientY - now.y
    if (Math.abs(now.moved) < SHEET_DRAG / 3) return
    // The sheet follows the finger, no taller than it opens in full.
    el.style.transition = 'none'
    el.style.maxHeight = `${Math.min(window.innerHeight * SHEET_FULL, Math.max(0, now.height - now.moved))}px`
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const now = drag.current
    if (!now || e.pointerId !== now.id) return
    drag.current = null
    const el = article.current
    if (el) {
      el.style.transition = ''
      el.style.maxHeight = ''
    }
    // Set afresh at every lift: a drag that brought no click must not hold over to the next press.
    dragged.current = Math.abs(now.moved) >= SHEET_DRAG
    if (dragged.current) setSheet((from) => sheetAfterDrag(from, now.moved))
  }
  const press = (e: MouseEvent<HTMLButtonElement>) => {
    // The click at the end of a drag has done its work already. A keyboard's click (detail 0) always counts.
    const afterDrag = dragged.current && e.detail !== 0
    dragged.current = false
    if (afterDrag) return
    setSheet((from) => (from === 'peek' ? 'full' : 'peek'))
  }

  const open = sheet === 'full'
  return (
    <article
      ref={article}
      aria-labelledby="place-name"
      data-covers-labels
      data-sheet={sheet}
      style={{ '--c': color } as CSSProperties}
      className={className}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-expanded={open}
        aria-controls={BODY_ID}
        aria-label={SHEET_HANDLE_NAME}
        onClick={press}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span aria-hidden className="sheet-grip" />
      </button>
      {header}
      {/* Focusable so the keyboard can scroll it when nothing inside it takes focus. At the peek, the keyboard
          arriving inside it opens the sheet, so what it reaches can be seen. */}
      <div
        id={BODY_ID}
        tabIndex={0}
        onFocus={(e) => {
          if (!open && focusVisible(e.target)) setSheet('full')
        }}
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-[22px] pb-[22px] pt-5"
      >
        {children}
      </div>
    </article>
  )
}
