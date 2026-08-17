import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { NameLogo } from '@/components/primitives/NameLogo'
import { Portrait } from '@/components/media/Portrait'
import { Figure } from '@/components/primitives/Figure'
import { GrowthBars } from '@/components/sections/GrowthBars'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { hero } from '@/content/hero'
import { journey } from '@/content/journey'
import { milestones, education } from '@/content/timeline'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <SectionPage title="About">
      <div className="grid items-center gap-10 text-center lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14 lg:text-left">
        <Portrait className="mx-auto max-w-[240px] lg:mx-0 lg:max-w-none" />
        <div>
          <p className="mb-2 font-sans text-label uppercase text-accent">{journey.about.eyebrow}</p>
          <NameLogo size="hero" animate />
          {/* mx-auto lg:mx-0 matches the paragraphs below. Without it the
              max-w-3xl box stays pinned left while the container is text-center,
              so between 768px and the lg breakpoint the headline centred inside
              its own box and visibly disagreed with the copy beneath it. */}
          <RevealOnActive index={1}>
            <h1 className="mx-auto mt-6 max-w-3xl font-serif text-[clamp(1.9rem,3.4vw,3.25rem)] leading-[1.12] text-fg lg:mx-0">
              {hero.headline}
            </h1>
          </RevealOnActive>
          <RevealOnActive index={2}>
            <p className="mx-auto mt-5 max-w-xl font-sans text-lg leading-relaxed text-fg lg:mx-0">{hero.why}</p>
          </RevealOnActive>
          <RevealOnActive index={3}>
            <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-fg-muted lg:mx-0">
              {journey.about.lede}
            </p>
          </RevealOnActive>
        </div>
      </div>

      {/* The résumé-grounded arc from content/timeline.ts — dated roles with
          what changed at each, rather than four undated role labels. */}
      <ol className="mx-auto mt-12 grid max-w-xl gap-8 sm:max-w-none sm:grid-cols-2">
        {milestones.map((m) => (
          <li key={m.marker} className="border-l-2 border-accent pl-5">
            <p className="font-sans text-label uppercase text-accent">{m.marker}</p>
            <h2 className="mt-1 font-serif text-2xl leading-tight text-fg">{m.title}</h2>
            <p className="mt-2 font-sans leading-relaxed text-fg-muted">{m.detail}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 font-sans text-sm text-fg-muted">
        <span className="font-semibold uppercase tracking-wide text-accent">Education</span>
        <span className="mx-2 text-rule" aria-hidden="true">
          |
        </span>
        {education.join(' · ')}
      </p>

      {/* Everything résumé-shaped lives on this one page now. /leadership was
          a second home for half of it and a fifth footer link nobody needed;
          its content is folded in below rather than orphaned behind a dead
          route. */}
      <div className="mt-16 border-t border-rule pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="font-sans text-label uppercase text-accent">{journey.lead.eyebrow}</p>
            <h2 className="mt-4 max-w-xl font-serif text-fluid-h2 text-fg">{journey.lead.statement}</h2>
            <p className="mt-5 max-w-xl font-sans leading-relaxed text-fg-muted">{journey.lead.context}</p>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {journey.lead.figures.map((f, i) => (
                <Figure key={f.label} value={f.value} label={f.label} index={i} />
              ))}
            </div>
          </div>
          <GrowthBars />
        </div>
      </div>

      {/* The delivery figures that used to sit on /work — moved here per the
          museum overhaul: no metric in the building itself. */}
      <div className="mt-16 border-t border-rule pt-12">
        <p className="font-sans text-label uppercase text-accent">{journey.build.eyebrow}</p>
        <h2 className="mt-4 max-w-2xl font-serif text-fluid-h2 text-fg">{journey.build.statement}</h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {journey.build.figures.map((f, i) => (
              <Figure key={f.label} value={f.value} label={f.label} index={i} />
            ))}
          </div>
          <p className="font-sans text-sm leading-relaxed text-fg-muted">{journey.build.context}</p>
        </div>
      </div>
    </SectionPage>
  )
}
