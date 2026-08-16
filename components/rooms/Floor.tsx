import { FEATURED, caseStudies, type CaseStudy } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'
import type { Project } from '@/content/types'
import { Room } from './Room'
import { Placard } from './Placard'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'
import { StackChips } from '@/components/primitives/StackChips'
import { RevealOnActive } from '@/components/journey/sceneActive'

/**
 * The seven pieces, joined to their projects at module load. A featured slug
 * with no matching project or case study fails the build rather than
 * rendering a silent hole on the wall.
 */
const pieces: { project: Project; study: CaseStudy }[] = FEATURED.map((slug) => {
  const project = projects.find((p) => p.slug === slug)
  if (!project) throw new Error(`The Floor: no project found for featured slug "${slug}"`)
  const study = caseStudies.find((c) => c.slug === slug)
  if (!study) throw new Error(`The Floor: no case study found for featured slug "${slug}"`)
  return { project, study }
})

/** Gallery lighting: a soft pool of accent behind each piece. Decorative only. */
export function FloorSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute top-[8%] h-[46vh] w-[26vw] min-w-[220px] rounded-[45%] bg-accent opacity-[0.07] blur-3xl"
          style={{ left: `${(i / pieces.length) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function FloorRoom() {
  return (
    <Room className="mx-auto max-h-[82svh] max-w-6xl overflow-y-auto pr-1">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.floor.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.floor.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans leading-relaxed text-fg-muted">{rooms.floor.lede}</p>
      </RevealOnActive>

      <RevealOnActive index={1}>
        <div className="mt-10 grid gap-x-10 gap-y-16 lg:grid-cols-2">
          {pieces.map(({ project, study }) => (
            <article key={project.slug}>
              <ProjectVisual media={project.media} name={project.name} />
              <h3 className="mt-4 font-serif text-2xl leading-tight text-fg">{project.name}</h3>
              <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.whatItIs}</p>
              <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.problem}</p>
              <p className="mt-3 font-sans leading-relaxed text-fg-muted">{study.whyBuiltThisWay}</p>
              <StackChips stack={project.stack} />
              {project.media?.gallery && <Gallery items={project.media.gallery} label={project.name} />}
              <Placard study={study} />
            </article>
          ))}
        </div>
      </RevealOnActive>
    </Room>
  )
}
