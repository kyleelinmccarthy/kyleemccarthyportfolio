import { projects } from '@/content/projects'
import { InfoTip } from '@/components/primitives/InfoTip'
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

/** Full project detail, surfaced on the standalone /work page. */
export function ProjectDetails() {
  return (
    <div className="mt-16">
      <h2 className="font-serif text-fluid-h2 text-fg">Every build</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {projects.map((p) => (
          <article key={p.slug} className="rounded-xl bg-surface-raised p-6 ring-1 ring-rule">
            <ProjectVisual media={p.media} name={p.name} className="mb-5" />
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-2xl leading-tight text-fg">{p.name}</h3>
              {p.isPersonal && (
                <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-accent">
                  Personal
                </span>
              )}
            </div>
            <p className="mt-1 font-sans text-sm text-fg-muted">{p.descriptor}</p>
            <dl className="mt-4 space-y-3">
              <Field label="Problem">{p.problem}</Field>
              <Field label="What I Built">{p.built}</Field>
              {p.outcome && <Field label="Outcome">{p.outcome}</Field>}
            </dl>
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
