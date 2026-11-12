import type { ReactNode } from 'react'

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
