'use client'

import { useCallback, useRef, type ReactNode, type RefObject } from 'react'

/**
 * A native `<dialog>` opened imperatively.
 *
 * Native gives focus trapping, Esc-to-close and an inert background for free —
 * the three things hand-rolled modals get wrong. What it does not give is
 * click-outside-to-close or a close affordance you can see without scrolling,
 * and both were missing: the only way out of a book was to scroll to the
 * bottom and find "Put it back".
 */
export function useModal() {
  const ref = useRef<HTMLDialogElement>(null)

  /**
   * Focus the trigger before showing. A native dialog restores focus to
   * whatever was document.activeElement when it opened, and Safari has
   * historically not focused buttons on mouse click — without this, where
   * focus lands on close would be browser-dependent.
   */
  const open = useCallback((trigger?: HTMLElement | null) => {
    trigger?.focus()
    ref.current?.showModal()
  }, [])

  const close = useCallback(() => ref.current?.close(), [])

  return { ref, open, close }
}

export function Modal({
  dialogRef,
  label,
  children,
  onKeyDown,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
  /** The dialog's accessible name. */
  label: string
  children: ReactNode
  onKeyDown?: (e: React.KeyboardEvent<HTMLDialogElement>) => void
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onKeyDown={onKeyDown}
      // Click outside to close. A click on the ::backdrop is reported against
      // the dialog element itself, so this fires only out there — which is
      // exactly why the dialog carries no padding of its own and the scroller
      // inside it does. Padding here would make a border of dead space that
      // dismissed the dialog when you clicked it.
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close()
      }}
      className="max-w-[min(92vw,44rem)] overflow-visible rounded-xl bg-surface-raised p-0 text-fg ring-1 ring-rule backdrop:bg-black/70"
    >
      {/* Outside the scroller on purpose: an absolutely-positioned close
          button inside it would scroll away on a long entry. */}
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xl leading-none text-fg-muted ring-1 ring-rule transition-colors hover:text-accent hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="max-h-[86vh] overflow-y-auto rounded-xl p-6 pt-14">{children}</div>
    </dialog>
  )
}
