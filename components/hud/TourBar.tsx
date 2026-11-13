'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { districts, placeById, tourOrder } from '@/content/world'
import { keyIsThePages } from '@/lib/keys'
import { placeHref } from '@/lib/world/route'
import { tourIndex, tourStep } from '@/lib/world/tour'

/** Set on the bar, to the place's id, once its keys are listened for: what a test waits on before pressing one. */
export const KEYS_READY = 'data-keys-for'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The stops the arrow keys have asked for and not yet reached, in order. A
 * hammered key presses again before the next page arrives, so each press steps
 * on from the last stop asked for rather than from the page still showing. It
 * lives outside the bar because the bar is mounted afresh with each place.
 */
let requested: string[] = []

/**
 * Previous / "03 / 19 · Beacon" / next, as links. On a place page the arrow
 * keys step along the tour and Escape returns to the planet.
 */
export function TourBar({ placeId }: { placeId: string }) {
  const router = useRouter()
  const bar = useRef<HTMLElement>(null)

  // Arriving at the last stop asked for, or somewhere else entirely, ends the run of presses.
  useEffect(() => {
    if (!requested.includes(placeId) || requested[requested.length - 1] === placeId) requested = []
  }, [placeId])

  useEffect(() => {
    const step = (delta: 1 | -1) => {
      const to = tourStep(requested[requested.length - 1] ?? placeId, delta)
      requested.push(to)
      router.push(placeHref(to))
    }
    const onKey = (e: KeyboardEvent) => {
      // Not while typing, and not while the character picker is open: its Escape closes it and nothing more.
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !keyIsThePages(e.target)) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Escape') {
        requested = []
        router.push('/')
      }
    }
    window.addEventListener('keydown', onKey)
    const el = bar.current
    el?.setAttribute(KEYS_READY, placeId)
    return () => {
      window.removeEventListener('keydown', onKey)
      el?.removeAttribute(KEYS_READY)
    }
  }, [router, placeId])

  const here = tourIndex(placeId)
  const place = placeById(placeId)
  if (!place || here < 0) return null

  return (
    <nav
      ref={bar}
      aria-label="Tour"
      data-covers-labels
      className="fixed bottom-8 left-1/2 z-[8] flex -translate-x-1/2 items-center gap-2 max-[820px]:bottom-auto max-[820px]:left-3.5 max-[820px]:right-3.5 max-[820px]:top-3.5 max-[820px]:translate-x-0"
    >
      <Link href={placeHref(tourStep(placeId, -1))} aria-label="Previous place" className="hud-btn glass">
        <span aria-hidden>←</span>
      </Link>
      <div className="glass min-w-[236px] px-[13px] py-[9px] text-center max-[820px]:min-w-0 max-[820px]:flex-1">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink">
          {`${pad(here + 1)} / ${tourOrder.length} · ${place.name}`}
        </div>
        <div aria-hidden className="mt-1.5 flex justify-center gap-[3px]">
          {tourOrder.map((id, i) => {
            const district = districts.find((d) => d.id === placeById(id)?.district)
            return (
              <i
                key={id}
                style={{ '--c': district?.color } as CSSProperties}
                className={`h-[3px] w-[9px] min-w-[3px] rounded-sm ${i <= here ? 'bg-[var(--c)]' : 'bg-line'}`}
              />
            )
          })}
        </div>
      </div>
      <Link href={placeHref(tourStep(placeId, 1))} aria-label="Next place" className="hud-btn glass">
        <span aria-hidden>→</span>
      </Link>
    </nav>
  )
}
