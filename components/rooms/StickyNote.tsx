import type { Project } from '@/content/types'

/**
 * Six token-only note colours, layered rather than flat.
 *
 * IMPORTANT: this project's semantic colours (`--fill`, `--accent`, …) are
 * plain CSS custom properties, not the `rgb(var(--x) / <alpha-value>)` triple
 * Tailwind needs to compile a slash-opacity variant. `bg-fill/24` or
 * `ring-accent/40` therefore silently produce NO rule at all — verified
 * against the actual build output, where not one `/`-opacity class on a
 * semantic token exists in the compiled CSS. That is the real reason the
 * previous four tints (three of which used exactly that syntax) all read as
 * the same near-invisible wash: three of the four were compiling to nothing.
 * Every colour below instead layers a full-opacity `bg-*` span under the
 * standalone `opacity-*` utility, which this file's own build confirms does
 * compile (`.opacity-60{opacity:.6}`), and ring colours skip the modifier too.
 *
 * That still leaves only two hues that are safe as a wash under this note's
 * own `text-fg` copy: `--fill` (gold in light, taupe in dark) and `--accent`
 * (green in light — but `--accent` IS `--fg` in dark, so a strong accent wash
 * would fight the very text sitting on it; capped lower here for that reason).
 * `--fg` itself is excluded as a wash for the same reason at any real
 * strength, and `--decor` duplicates `--fill`'s value in both themes, so it
 * isn't a third colour. Six notes come from varying the strength of those two
 * safe hues, plus two two-layer blends — bold gold, soft gold, bold green,
 * soft green, and gold/green mixed in each direction.
 */
const TINTS: { layers: { color: string; opacity: string }[]; ring: string }[] = [
  { layers: [{ color: 'bg-fill', opacity: 'opacity-60' }], ring: 'ring-fill' },
  { layers: [{ color: 'bg-fill', opacity: 'opacity-25' }], ring: 'ring-fill' },
  { layers: [{ color: 'bg-accent', opacity: 'opacity-35' }], ring: 'ring-accent' },
  { layers: [{ color: 'bg-accent', opacity: 'opacity-15' }], ring: 'ring-accent' },
  {
    layers: [
      { color: 'bg-fill', opacity: 'opacity-50' },
      { color: 'bg-accent', opacity: 'opacity-20' },
    ],
    ring: 'ring-fill',
  },
  {
    layers: [
      { color: 'bg-accent', opacity: 'opacity-30' },
      { color: 'bg-fill', opacity: 'opacity-15' },
    ],
    ring: 'ring-accent',
  },
]

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

/** A tint keyed by the project's own slug — stable and needs no extra prop. */
function tintFor(slug: string): (typeof TINTS)[number] {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % TINTS.length
  return TINTS[hash]!
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
  const tint = tintFor(project.slug)
  const className = [
    'group relative block h-full overflow-hidden rounded-md bg-surface-raised shadow-sm ring-1',
    tint.ring,
    'transition-transform duration-200 ease-out',
    'hover:-translate-y-1 hover:shadow-md',
    'focus-visible:-translate-y-1 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    sizeFor(project.slug),
  ].join(' ')
  const style = { transform: `rotate(${tilt}deg)` }

  const body = (
    <>
      {tint.layers.map((layer, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${layer.color} ${layer.opacity}`}
        />
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-4 w-4 bg-surface shadow-sm transition-all duration-200 [clip-path:polygon(100%_0,0_0,100%_100%)] group-hover:h-6 group-hover:w-6 group-focus-visible:h-6 group-focus-visible:w-6"
      />
      <p className="relative font-serif text-lg leading-tight text-fg">{project.name}</p>
      <p className="relative mt-1 font-sans text-xs text-fg-muted">{project.descriptor}</p>
      <p className="relative mt-2 font-sans text-sm leading-snug text-fg-muted">{project.headline}</p>
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
