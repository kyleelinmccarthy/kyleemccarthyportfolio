'use client'

import Link from 'next/link'
import { useEffect, useId, useState, type CSSProperties } from 'react'
import type { District } from '@/content/types'
import { districtHref } from '@/lib/world/route'

/** At or below this width the legend starts folded, so the planet keeps the screen. */
export const LEGEND_FOLDS_BELOW = 820

/**
 * The five districts in tour order, each numbered by its place in that order
 * and linking to its island, under a heading that folds the list away and
 * brings it back. It stands on a plate (`.hud-plate`), so its text holds AA
 * whatever drifts behind it: a cloud, the planet.
 *
 * It starts open on a wide screen and folded on a phone. Until the visitor
 * chooses, that is decided in CSS (`data-open` is absent), so the server's
 * markup is right for both without a flash; after a press it is theirs.
 */
export function Legend({ districts }: { districts: District[] }) {
  const listId = useId()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${LEGEND_FOLDS_BELOW}px)`)
    const read = () => setNarrow(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

  const open = chosen ?? !narrow

  return (
    <div className="hud-plate legend m-0" data-open={chosen === null ? undefined : String(chosen)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setChosen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 py-1 text-left font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted"
      >
        <span>Districts</span>
        <span aria-hidden className="legend-chevron text-[12px] leading-none text-ink">
          ▾
        </span>
      </button>
      <ul
        id={listId}
        className="legend-list m-0 mt-1 list-none gap-0.5 p-0 max-[820px]:flex-wrap max-[820px]:gap-x-4 max-[820px]:gap-y-0"
      >
        {districts.map((district, index) => (
          <li key={district.id}>
            <Link
              href={districtHref(district.id)}
              style={{ '--c': district.color } as CSSProperties}
              className="group grid w-full grid-cols-[10px_auto_auto_1fr] items-center gap-[11px] py-1 text-left text-ink no-underline max-[820px]:w-auto max-[820px]:grid-cols-[10px_auto_auto] max-[820px]:gap-[7px]"
            >
              <span
                aria-hidden
                className="col-start-1 row-start-1 h-2.5 w-2.5 rounded-full bg-[var(--c)] shadow-[0_0_0_2px_var(--edge)]"
              />
              <span className="col-start-2 row-start-1 font-mono text-[10.5px] tracking-[0.13em] text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="col-start-3 row-start-1 text-[13px] font-semibold group-hover:underline group-hover:underline-offset-[3px]">
                {district.name}
              </span>
              <span className="col-start-4 row-start-1 font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted max-[820px]:hidden">
                {district.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
