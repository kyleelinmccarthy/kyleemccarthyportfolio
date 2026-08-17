import Link from 'next/link'
import { rooms } from '@/content/rooms'

/**
 * The last beat of the home scroll: a door with warm light under it. Plays on
 * the light-switch theme toggle the site already owns.
 *
 * A plain <Link> styled as a door, so it works without JS, is keyboard
 * reachable and is crawlable. Drawn in CSS and inline SVG rather than an image
 * so it themes correctly in both modes. The light glow is bg-accent at low
 * opacity with a blur — a semantic token, not a hardcoded warm hex, so it
 * reads correctly in both light and dark themes.
 *
 * The aria-label is built from the visible text so it always starts with it —
 * WCAG 2.5.3 Label in Name. A voice-control user saying what they can see has
 * to be able to activate the link, and that stays true through a reword.
 */
export function Door() {
  return (
    <Link
      href="/room"
      aria-label={`${rooms.wayOut.door.label} — ${rooms.wayOut.door.description}`}
      className="group mt-12 inline-flex flex-col items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="relative block h-40 w-24 rounded-t-[3rem] bg-surface-raised ring-1 ring-rule transition-colors group-hover:ring-accent">
        {/* handle */}
        <span className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent" />
        {/* light spilling under the door, brighter on hover */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-1/2 h-2 w-28 -translate-x-1/2 rounded-full bg-accent opacity-40 blur-md transition-opacity duration-500 group-hover:opacity-90"
        />
      </span>
      <span className="font-sans text-label uppercase text-fg-muted transition-colors group-hover:text-accent">
        {rooms.wayOut.door.label}
      </span>
    </Link>
  )
}
