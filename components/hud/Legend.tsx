import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { District, Place } from '@/content/types'
import { districtHref } from '@/lib/world/route'

/**
 * The five districts, each linking to its island with a count of the places
 * in it. It stands on a plate (`.hud-plate`), so its text holds AA whatever
 * drifts behind it: a cloud, the planet.
 */
export function Legend({ districts, places }: { districts: District[]; places: Place[] }) {
  return (
    <ul className="hud-plate m-0 grid list-none gap-0.5">
      {districts.map((district) => {
        const count = places.filter((place) => place.district === district.id).length
        return (
          <li key={district.id}>
            <Link
              href={districtHref(district.id)}
              style={{ '--c': district.color } as CSSProperties}
              className="group grid w-full grid-cols-[10px_auto_1fr] items-center gap-[11px] py-1 text-left text-ink no-underline"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full bg-[var(--c)] shadow-[0_0_0_2px_var(--edge)]"
              />
              <span className="text-[13px] font-semibold group-hover:underline group-hover:underline-offset-[3px]">
                {district.name}
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">
                {`${String(count).padStart(2, '0')} · ${district.blurb}`}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
