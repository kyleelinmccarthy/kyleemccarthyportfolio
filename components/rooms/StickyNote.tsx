import type { Project } from '@/content/types'

/**
 * A pack of sticky notes — yellow, pink, blue, green, orange, violet.
 *
 * These are real Post-it colours rather than tints of the site palette, and
 * that is deliberate: the palette is cream, green and taupe, and no amount of
 * mixing it produces a pack of sticky notes. A note is a physical object being
 * depicted, the same argument as the lightbox's black scrim. They are still
 * tokens defined per theme in globals.css, not hex scattered through here, and
 * they are deepened slightly in dark mode so a desk drawer's worth of them does
 * not glare.
 *
 * Text on a note is always --note-ink, because every one of these is a light
 * colour in both themes and the site's own foreground flips.
 */
const NOTES = [
  { bg: 'bg-note-1', ring: 'ring-note-1' },
  { bg: 'bg-note-2', ring: 'ring-note-2' },
  { bg: 'bg-note-3', ring: 'ring-note-3' },
  { bg: 'bg-note-4', ring: 'ring-note-4' },
  { bg: 'bg-note-5', ring: 'ring-note-5' },
  { bg: 'bg-note-6', ring: 'ring-note-6' },
] as const

/**
 * A small, fixed sequence of tilt angles, cycled by index. Deterministic —
 * Math.random() would give the server and the client different markup and
 * break hydration.
 */
const TILT_STEPS = [-3, 2, -4, 3, -1.5, 4, -2.5, 1.5]

/** A little size variation so the desk doesn't read as a uniform grid of one card, printed six times. */
const SIZE_STEPS = ['p-4', 'p-5', 'p-3.5', 'p-5']

export function tiltForIndex(index: number): number {
  return TILT_STEPS[index % TILT_STEPS.length]!
}

/** A colour keyed by the project's own slug — stable and needs no extra prop. */
function noteFor(slug: string): (typeof NOTES)[number] {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % NOTES.length
  return NOTES[hash]!
}

function sizeFor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i) * 7) % SIZE_STEPS.length
  return SIZE_STEPS[hash]!
}

/**
 * One project, pinned to the desk. A note with somewhere to send you renders
 * as a real link; one without renders as a plain, non-interactive card —
 * never an anchor with no destination. Lifts on hover and on focus, so the
 * affordance isn't mouse-only. The top-right corner is peeled back a touch —
 * the bit of "underneath" showing through is the desk surface, not the note's
 * own colour — and lifts further when the note itself lifts.
 */
export function StickyNote({ project, tilt }: { project: Project; tilt: number }) {
  const note = noteFor(project.slug)
  const className = [
    'group relative block h-full overflow-hidden rounded-md shadow-md ring-1',
    note.bg,
    note.ring,
    'transition-transform duration-200 ease-out',
    'hover:-translate-y-1 hover:shadow-md',
    'focus-visible:-translate-y-1 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    sizeFor(project.slug),
  ].join(' ')
  const style = { transform: `rotate(${tilt}deg)` }

  const body = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-4 w-4 bg-surface shadow-sm transition-all duration-200 [clip-path:polygon(100%_0,0_0,100%_100%)] group-hover:h-6 group-hover:w-6 group-focus-visible:h-6 group-focus-visible:w-6"
      />
      <p className="relative font-serif text-lg leading-tight text-note-ink">{project.name}</p>
      <p className="relative mt-1 font-sans text-xs text-note-ink/70">{project.descriptor}</p>
      <p className="relative mt-2 font-sans text-sm leading-snug text-note-ink/70">{project.headline}</p>
    </>
  )

  if (project.liveUrl) {
    return (
      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {body}
      </a>
    )
  }

  return (
    <div className={className} style={style}>
      {body}
    </div>
  )
}
