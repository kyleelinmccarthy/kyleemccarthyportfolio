import type { ReactNode } from 'react'
import type { Degree } from '@/content/types'

/**
 * The few type styles every panel shares, from the `#panel` block of the look
 * test: a mono caps kicker, a display lead line, and 14.5px muted prose.
 */

/** Small mono caps, muted. Used for the line under the name and for labels. */
export const kickerClass = 'font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted'

/** The line under the name: what the place is, in a few words. */
export function Kind({ children }: { children: ReactNode }) {
  return <p className={`m-0 mb-[17px] ${kickerClass}`}>{children}</p>
}

/** The display lead line: a headline, or the sentence a panel opens on. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="m-0 mb-3 font-display text-[19px] font-medium leading-[1.3] text-ink">{children}</p>
}

/** A paragraph of body copy. */
export function Prose({ children }: { children: ReactNode }) {
  return <p className="m-0 mb-[15px] text-[14.5px] leading-[1.62] text-muted">{children}</p>
}

/** A section heading inside a panel (the place name is the page's h1). */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="m-0 mb-2 font-display text-[19px] font-bold leading-[1.25] text-ink">{children}</h2>
}

/** A few figures, each a large value with its label beside it. */
export function Figures({ figures }: { figures: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <ul className="m-0 mb-[15px] grid list-none gap-3 p-0">
      {figures.map((figure) => (
        <li key={figure.label} className="grid grid-cols-[88px_1fr] items-baseline gap-2.5 border-t border-line pt-2.5">
          <span className="font-display text-xl font-extrabold leading-none text-ink">{figure.value}</span>
          <span className="text-[13.5px] leading-snug text-muted">{figure.label}</span>
        </li>
      ))}
    </ul>
  )
}

/** Her degrees, one to a line: the degree, then the school and year. */
export function Education({ degrees }: { degrees: readonly Degree[] }) {
  return (
    <ul className="m-0 mb-[17px] list-none p-0 text-[13.5px] leading-[1.55] text-ink">
      {degrees.map((d) => (
        <li key={d.degree}>
          <span className="font-semibold">{d.degree}</span>
          <span className="text-muted">{`, ${d.school}, ${d.year}`}</span>
        </li>
      ))}
    </ul>
  )
}
