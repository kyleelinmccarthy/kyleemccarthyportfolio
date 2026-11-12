'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

interface IndexDrawerValue {
  open: boolean
  setOpen(open: boolean): void
  /** Close the drawer and hand focus back to the Index button. */
  dismiss(): void
  triggerRef: RefObject<HTMLButtonElement | null>
}

// Outside a provider the index is just a list in the page: closed, and inert.
const fallback: IndexDrawerValue = {
  open: false,
  setOpen() {},
  dismiss() {},
  triggerRef: { current: null },
}

const IndexDrawerContext = createContext<IndexDrawerValue>(fallback)

const isIndexHash = () => window.location.hash === '#index'

/** Holds whether the index drawer is open, and opens it for `#index` in the URL. */
export function IndexDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (isIndexHash()) setOpen(true)
    const onHash = () => {
      if (isIndexHash()) setOpen(true)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const dismiss = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  const value = useMemo(() => ({ open, setOpen, dismiss, triggerRef }), [open, dismiss])
  return <IndexDrawerContext.Provider value={value}>{children}</IndexDrawerContext.Provider>
}

export function useIndexDrawer(): IndexDrawerValue {
  return useContext(IndexDrawerContext)
}

/** The header's Index control on the home page. */
export function IndexButton({ className = '' }: { className?: string }) {
  const { open, setOpen, triggerRef } = useIndexDrawer()
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-controls="index"
      onClick={() => setOpen(!open)}
      className={className}
    >
      Index
    </button>
  )
}
