import Link from 'next/link'
import { projects } from '@/content/projects'
import { InfoTip } from '@/components/primitives/InfoTip'
import { StackChips } from '@/components/primitives/StackChips'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

// Spec §4: /work carries the professional work; the personal projects live in
// /room, presented separately. Rendering the full list here duplicated all nine
// personal cards onto /work.
const professionalProjects = projects.filter((p) => !p.isPersonal)

/** Full project detail, surfaced on the standalone /work page. */
export function ProjectDetails() {
  return (
    <div className="mt-16">
      <h2 className="font-serif text-fluid-h2 text-fg">Recent work</h2>
      <p className="mt-3 max-w-2xl font-sans text-fg-muted">
        The professional side — platforms, portals and internal tools, built recently or
        still being built. Not a career’s worth: the things I make after hours are in{' '}
        <Link href="/room" className="font-semibold text-accent underline-offset-4 hover:underline">
          the library
        </Link>
        .
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {professionalProjects.map((p) => (
          <article key={p.slug} className="rounded-xl bg-surface-raised p-6 ring-1 ring-rule">
            <ProjectVisual media={p.media} name={p.name} className="mb-5" />
            <h3 className="font-serif text-2xl leading-tight text-fg">{p.name}</h3>
            <p className="mt-1 font-sans text-sm text-fg-muted">{p.descriptor}</p>
            <dl className="mt-4 space-y-3">
              <Field label="Problem">{p.problem}</Field>
              <Field label="What I Built">{p.built}</Field>
              {p.outcome && <Field label="Outcome">{p.outcome}</Field>}
            </dl>
            <StackChips stack={p.stack} />
            {p.media?.gallery && <Gallery items={p.media.gallery} label={p.name} />}
            {p.liveUrl ? (
              <a
                href={p.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent"
              >
                Visit
                <span aria-hidden="true">↗</span>
                <span className="sr-only">{p.name} (opens in a new tab)</span>
              </a>
            ) : (
              p.embedNote && (
                <div className="mt-4">
                  <InfoTip
                    label="Where to see it"
                    buttonClassName="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent"
                  >
                    {p.embedNote}
                  </InfoTip>
                </div>
              )
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
