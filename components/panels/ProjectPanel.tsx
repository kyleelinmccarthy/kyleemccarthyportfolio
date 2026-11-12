import Image from 'next/image'
import { Gallery } from '@/components/media/Gallery'
import { StackChips } from '@/components/primitives/StackChips'
import { placardCopy, type CaseStudy } from '@/content/caseStudies'
import type { Project, ProjectStatus } from '@/content/types'
import { Kind, Lead, kickerClass } from './parts'

const STATUS_WORD: Record<ProjectStatus, string> = {
  production: 'In production',
  releasing: 'Releasing',
  building: 'Building',
  beta: 'In beta',
  concept: 'Concept',
}

/** A labelled passage: problem, what was built, outcome. */
function Passage({ label, children }: { label: string; children: string }) {
  return (
    <div className="mb-[15px]">
      <dt className={`mb-1 ${kickerClass}`}>{label}</dt>
      <dd className="m-0 text-[14.5px] leading-[1.62] text-muted">{children}</dd>
    </div>
  )
}

function Placard({ study }: { study: CaseStudy }) {
  const { placard } = study
  if (!placard) return null
  const lines = [
    [placardCopy.hard, placard.hard],
    [placardCopy.threwAway, placard.threwAway],
    [placardCopy.differently, placard.differently],
    [placardCopy.builtFor, placard.builtFor],
  ] as const
  return (
    <details className="group mb-[17px] border border-line">
      <summary className="cursor-pointer list-none px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.13em] text-ink marker:content-none">
        {placardCopy.hint}
        <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <dl className="m-0 border-t border-line px-3 pb-1 pt-3">
        {lines.map(([label, text]) => (
          <Passage key={label} label={label}>
            {text}
          </Passage>
        ))}
      </dl>
    </details>
  )
}

/**
 * A project, in the order the look test lays it out: descriptor, hero,
 * headline, problem, what was built, outcome, facts, placard, gallery, chips,
 * then the status and the link. Everything after the headline and `built` is
 * optional and leaves nothing behind when it is missing. The name is the
 * page's h1, which the panel shell supplies.
 */
export function ProjectPanel({ project, study }: { project: Project; study?: CaseStudy }) {
  const hero = project.media?.hero
  const gallery = project.media?.gallery
  return (
    <>
      <Kind>{project.descriptor}</Kind>
      {hero && (
        <div className="relative mb-[17px] aspect-[16/10] overflow-hidden rounded-[3px] [box-shadow:var(--shadow)]">
          <Image src={hero.src} alt={hero.alt} fill sizes="356px" className="object-cover object-top" />
        </div>
      )}
      <Lead>{project.headline}</Lead>
      <dl className="m-0">
        {project.problem && <Passage label="Problem">{project.problem}</Passage>}
        <Passage label="What I Built">{project.built}</Passage>
        {project.outcome && <Passage label="Outcome">{project.outcome}</Passage>}
      </dl>
      {project.facts && project.facts.length > 0 && (
        <dl className="m-0 mb-[17px] border-t border-line text-[13.5px]">
          {project.facts.map((fact) => (
            <div key={fact.label} className="grid grid-cols-[98px_1fr] gap-2.5 border-b border-line py-2">
              <dt className="pt-0.5 font-mono text-muted">{fact.label}</dt>
              <dd className="m-0 text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {study && <Placard study={study} />}
      {gallery && gallery.length > 0 && <Gallery items={gallery} label={project.name} />}
      <StackChips stack={project.stack} />
      <div className="mt-5 flex items-center gap-3 border-t border-line pt-[13px]">
        <span className="inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink">
          <i aria-hidden="true" className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[var(--c)]" />
          {project.statusLabel ?? STATUS_WORD[project.status]}
        </span>
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass hud-btn hud-btn-primary ml-auto"
          >
            {project.liveLabel ?? 'Visit'}
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
      </div>
    </>
  )
}
