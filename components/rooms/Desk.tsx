import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'
import { Room } from './Room'
import { StickyNote, tiltForIndex } from './StickyNote'
import { RevealOnActive } from '@/components/journey/sceneActive'

/** Everything not hung on the wall — the overflow, not the exhibition. */
const onDesk = projects.filter((p) => !FEATURED.includes(p.slug as never))

/** A desk surface and a lamp pool of accent light. Decorative only. */
export function DeskSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-surface-raised opacity-60" />
      <div className="absolute left-1/2 top-[6%] h-[58vh] w-[46vw] min-w-[280px] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.12] blur-3xl" />
    </div>
  )
}

export function DeskRoom() {
  return (
    <Room className="mx-auto max-h-[82svh] max-w-6xl overflow-y-auto pr-1">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.desk.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.desk.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans leading-relaxed text-fg-muted">{rooms.desk.lede}</p>
      </RevealOnActive>

      <RevealOnActive index={1}>
        <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {onDesk.map((p, i) => (
            <li key={p.slug}>
              <StickyNote project={p} tilt={tiltForIndex(i)} />
            </li>
          ))}
        </ul>
      </RevealOnActive>
    </Room>
  )
}
