import type { Project } from '@/content/types'

/**
 * Token tints, not stock Tailwind yellows, so the notes still theme
 * correctly in both palettes.
 */
const TINTS = ['bg-accent/10', 'bg-accent/20', 'bg-surface-raised', 'bg-fill/10']

/**
 * A small, fixed sequence of tilt angles, cycled by index. Deterministic —
 * Math.random() would give the server and the client different markup and
 * break hydration.
 */
const TILT_STEPS = [-3, 2, -4, 3, -1.5, 4, -2.5, 1.5]

export function tiltForIndex(index: number): number {
  return TILT_STEPS[index % TILT_STEPS.length]!
}

/** A tint keyed by the project's own slug — stable and needs no extra prop. */
function tintFor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % TINTS.length
  return TINTS[hash]!
}

/**
 * One project, pinned to the desk. A note with somewhere to send you renders
 * as a real link; one without renders as a plain, non-interactive card —
 * never an anchor with no destination. Lifts on hover and on focus, so the
 * affordance isn't mouse-only.
 */
export function StickyNote({ project, tilt }: { project: Project; tilt: number }) {
  const className = [
    'group block h-full rounded-md p-4 shadow-sm ring-1 ring-rule',
    'transition-transform duration-200 ease-out',
    'hover:-translate-y-1 hover:shadow-md',
    'focus-visible:-translate-y-1 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    tintFor(project.slug),
  ].join(' ')
  const style = { transform: `rotate(${tilt}deg)` }

  const body = (
    <>
      <p className="font-serif text-lg leading-tight text-fg">{project.name}</p>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-fg-muted">{project.descriptor}</p>
      <p className="mt-2 font-sans text-sm leading-snug text-fg-muted">{project.headline}</p>
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
