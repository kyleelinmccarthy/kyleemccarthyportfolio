import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import type { District, Place } from '@/content/types'
import { formatCoord } from '@/lib/world/geo'
import { districtHref } from '@/lib/world/route'

/**
 * The detail panel for one place: district chip, coordinates, a close link back
 * to the place's district (so closing keeps the visitor over the island they
 * were looking at), and the place's name as the page's heading. On a phone it is a
 * bottom sheet no taller than 58vh.
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
    <article
      aria-labelledby="place-name"
      data-covers-labels
      style={{ '--c': district.color } as CSSProperties}
      className="glass fixed bottom-[98px] right-10 top-[98px] z-[8] flex w-[400px] flex-col max-[820px]:bottom-3.5 max-[820px]:left-3.5 max-[820px]:right-3.5 max-[820px]:top-auto max-[820px]:max-h-[58vh] max-[820px]:w-auto"
    >
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
      {/* Focusable so the keyboard can scroll it when nothing inside it takes focus. */}
      <div tabIndex={0} className="min-h-0 flex-1 overflow-auto px-[22px] pb-[22px] pt-5">
        <h1
          id="place-name"
          className="mb-[9px] font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.015em]"
        >
          {place.name}
        </h1>
        {children}
      </div>
    </article>
  )
}
