import type { ReactNode } from 'react'
import { projects } from '@/content/projects'
import { room, artAlt, tattooAlt } from '@/content/room'
import { ProjectVisual } from '@/components/media/ProjectVisual'
import { Gallery } from '@/components/media/Gallery'

const personalProjects = projects.filter((p) => p.isPersonal)

// Built from the alt maps so a new import needs no component change — drop a
// file in public/media/art (or /tattoo) with a matching artAlt/tattooAlt
// entry and it shows up here automatically.
const artItems = Object.entries(artAlt).map(([slug, alt]) => ({
  src: `/media/art/${slug}.jpg`,
  alt,
}))

const tattooItems = Object.entries(tattooAlt).map(([slug, alt]) => ({
  src: `/media/tattoo/${slug}.jpg`,
  alt,
}))

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

/**
 * The body of /room — the personal side. Order follows the brief: the after-
 * hours projects, the art wall, the tattoo flash, then what I do off the
 * clock and an invitation to say hi. SectionPage already renders the page's
 * one <h1>, so every heading in here is an <h2>.
 */
export function RoomSections() {
  return (
    <div className="space-y-20">
      <div>
        <p className="font-sans text-label uppercase text-accent">{room.intro.eyebrow}</p>
        <h2 className="mt-3 font-serif text-fluid-h2 text-fg">{room.intro.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-fg-muted">{room.intro.lede}</p>
      </div>

      <section aria-labelledby="room-projects-heading">
        <h2 id="room-projects-heading" className="font-serif text-fluid-h2 text-fg">
          {room.projects.heading}
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.projects.lede}</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {personalProjects.map((p) => (
            <article key={p.slug} className="rounded-xl bg-surface-raised p-6 ring-1 ring-rule">
              <ProjectVisual media={p.media} name={p.name} className="mb-5" />
              <h3 className="font-serif text-2xl leading-tight text-fg">{p.name}</h3>
              <p className="mt-1 font-sans text-sm text-fg-muted">{p.descriptor}</p>
              <dl className="mt-4 space-y-3">
                <Field label="Problem">{p.problem}</Field>
                <Field label="What I Built">{p.built}</Field>
                {p.outcome && <Field label="Outcome">{p.outcome}</Field>}
              </dl>
              {p.media?.gallery && <Gallery items={p.media.gallery} label={p.name} />}
              {p.liveUrl && (
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
              )}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="room-art-heading">
        <h2 id="room-art-heading" className="font-serif text-fluid-h2 text-fg">
          {room.art.heading}
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.art.lede}</p>
        <Gallery items={artItems} label={room.art.heading} />
      </section>

      <section aria-labelledby="room-tattoo-heading">
        <h2 id="room-tattoo-heading" className="font-serif text-fluid-h2 text-fg">
          {room.tattoo.heading}
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.tattoo.lede}</p>
        <Gallery items={tattooItems} label={room.tattoo.heading} />
      </section>

      <section aria-labelledby="room-off-heading">
        <h2 id="room-off-heading" className="font-serif text-fluid-h2 text-fg">
          {room.offTheClock.heading}
        </h2>
        <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {room.offTheClock.items.map((item) => (
            <div key={item.title}>
              <dt className="font-sans font-semibold text-fg">{item.title}</dt>
              <dd className="mt-1 font-sans text-fg-muted">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="room-sayhi-heading"
        className="rounded-xl bg-surface-raised p-8 ring-1 ring-rule"
      >
        <h2 id="room-sayhi-heading" className="font-serif text-fluid-h2 text-fg">
          {room.sayHi.heading}
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.sayHi.body}</p>
      </section>
    </div>
  )
}
