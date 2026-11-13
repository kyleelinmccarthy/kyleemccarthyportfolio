import Link from 'next/link'
import type { ReactNode } from 'react'
import { guide } from '@/content/guide'
import type { District, Place } from '@/content/types'
import { formatCoord } from '@/lib/world/geo'
import { districtHref } from '@/lib/world/route'
import { PlaceSheet } from './PlaceSheet'

/**
 * The detail panel for one place: district chip, coordinates, a close link back
 * to the place's district (so closing keeps the visitor over the island they
 * were looking at), and the place's name as the page's heading. On a phone it is a
 * bottom sheet no taller than 58dvh, which with JavaScript opens to a peek and
 * has a handle to open it in full (`PlaceSheet`). This part stays on the server:
 * the coordinates come from lib/world/geo, which would bring three.js with it.
 */
export function PanelShell({
  place,
  district,
  children,
}: {
  place: Place
  district: District
  children: ReactNode
}) {
  return (
    <PlaceSheet
      placeId={place.id}
      color={district.color}
      className="place-sheet glass fixed bottom-[98px] right-10 top-[98px] z-[8] flex w-[400px] flex-col max-[820px]:bottom-3.5 max-[820px]:left-3.5 max-[820px]:right-3.5 max-[820px]:top-auto max-[820px]:max-h-[58dvh] max-[820px]:w-auto"
      header={
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-[13px]">
          <span className="inline-flex items-center gap-2 border border-[var(--c)] px-[9px] py-1 font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink">
            <i aria-hidden className="h-2 w-2 rounded-full bg-[var(--c)]" />
            {district.name}
          </span>
          <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">
            {formatCoord(place.at)}
          </span>
          <Link href={districtHref(district.id)} aria-label="Close" className="p-1 text-[15px] leading-none text-ink no-underline">
            <span aria-hidden>✕</span>
          </Link>
        </div>
      }
    >
      <h1 id="place-name" className="mb-[9px] font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.015em]">
        {place.name}
      </h1>
      {/* The guide's line for the place, for a page without the world; while it draws she says it herself (`.guide-note`). */}
      {guide.places[place.id] ? (
        <p className="guide-note mb-3 mt-1 border-l-2 border-[var(--c)] pl-2.5 text-[14px] leading-[1.45] text-ink">
          <span className="mr-1.5 font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">Kylee says</span>
          {guide.places[place.id]}
        </p>
      ) : null}
      {children}
    </PlaceSheet>
  )
}
