import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { District } from '@/content/types'
import { districtHref } from '@/lib/world/route'

/**
 * The five districts in tour order, each numbered by its place in that order
 * and linking to its island. It stands on a plate (`.hud-plate`), so its text
 * holds AA whatever drifts behind it: a cloud, the planet. On a phone it is a
 * compact strip of numbered names (the blurbs are dropped), so it leaves the
 * planet most of the screen.
 */
export function Legend({ districts }: { districts: District[] }) {
  return (
    <ul className="hud-plate m-0 grid list-none gap-0.5 max-[820px]:flex max-[820px]:flex-wrap max-[820px]:gap-x-4 max-[820px]:gap-y-0">
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
  )
}
