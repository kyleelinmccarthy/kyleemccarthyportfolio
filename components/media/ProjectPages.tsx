import type { ReactNode } from 'react'
import type { Project } from '@/content/types'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'
import { StackChips } from '@/components/primitives/StackChips'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

/**
 * Everything a project's old card carried, for the inside of the thing that
 * now stands in for it — a book on the library's shelf, or a note on the desk.
 * Shared so the two never drift into showing different fields.
 */
export function ProjectPages({ project }: { project: Project }) {
  return (
    <>
      <ProjectVisual media={project.media} name={project.name} className="mb-5" />
      <h3 className="font-serif text-2xl leading-tight text-fg">{project.name}</h3>
      <p className="mt-1 font-sans text-sm text-fg-muted">{project.descriptor}</p>
      <dl className="mt-4 space-y-3">
        <Field label="Problem">{project.problem}</Field>
        <Field label="What I Built">{project.built}</Field>
        {project.outcome && <Field label="Outcome">{project.outcome}</Field>}
      </dl>
      <StackChips stack={project.stack} />
      {project.media?.gallery && <Gallery items={project.media.gallery} label={project.name} />}
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Visit
          <span aria-hidden="true">↗</span>
          <span className="sr-only">{project.name} (opens in a new tab)</span>
        </a>
      )}
    </>
  )
}
