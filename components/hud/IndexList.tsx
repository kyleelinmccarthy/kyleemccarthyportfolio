'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { District, Place } from '@/content/types'
import { placeHref } from '@/lib/world/route'
import { useIndexDrawer } from './IndexDrawer'

/**
 * Every place, grouped by district and numbered in tour order. It is always in
 * the HTML; see `.index-panel` in globals.css for how it behaves with and
 * without JavaScript.
 */
export function IndexList({
  districts,
  places,
  tourOrder,
}: {
  districts: District[]
  places: Place[]
  tourOrder: string[]
}) {
  const { open, dismiss } = useIndexDrawer()
  const ref = useRef<HTMLElement>(null)

  // Opening the drawer moves focus into it, so the keyboard does not have to tab through the page first.
  useEffect(() => {
    if (open) ref.current?.querySelector('a')?.focus()
  }, [open])

  return (
    <nav
      ref={ref}
      id="index"
      aria-label="Every place"
      data-open={open}
      data-covers-labels
      className="index-panel glass"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute right-3 top-3 hidden p-1 text-[15px] leading-none text-ink [[data-js]_&]:block"
      >
        <span aria-hidden>✕</span>
      </button>
      {districts.map((district) => (
        <section
          key={district.id}
          style={{ '--c': district.color } as CSSProperties}
          className="[&:first-of-type>h2]:mt-1.5"
        >
          <h2 className="mb-1.5 mt-[17px] flex items-center gap-[9px] font-display text-base font-semibold">
            <i aria-hidden className="h-[9px] w-[9px] rounded-full bg-[var(--c)]" />
            {district.name}
          </h2>
          <ol className="m-0 list-none p-0">
            {places
              .filter((place) => place.district === district.id)
              .map((place) => (
                <li key={place.id}>
                  <Link
                    href={placeHref(place.id)}
                    className="grid grid-cols-[26px_1fr] border-b border-line py-2 text-[13.5px] text-ink no-underline hover:bg-line focus-visible:outline-offset-[-2px]"
                  >
                    <span className="text-muted">
                      {String(tourOrder.indexOf(place.id) + 1).padStart(2, '0')}
                    </span>
                    <span>{place.name}</span>
                  </Link>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </nav>
  )
}
