import { Portrait } from '@/components/media/Portrait'
import { GrowthBars } from '@/components/sections/GrowthBars'
import { about, build, hero, lead, resumeLabel } from '@/content/about'
import { profileCopy } from '@/content/profile'
import { site } from '@/content/site'
import { education, milestones } from '@/content/timeline'
import type { Place } from '@/content/types'
import { Education, Figures, Kind, Lead, Prose, SectionHeading, kickerClass } from './parts'

/**
 * Home: who she is, how she got here, what she does now, and the résumé.
 * `about.lede` is deliberately not shown: it points at a portfolio page and a
 * library that no longer exist. It stays in content/about.ts for the owner to rewrite.
 */
export function AboutPanel({ place }: { place: Place }) {
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      <Portrait className="mx-auto mb-[17px] max-w-[240px]" />
      <Lead>{hero.headline}</Lead>
      <Prose>{hero.why}</Prose>

      <section className="border-t border-line pt-4">
        <SectionHeading>{about.arc.heading}</SectionHeading>
        <Prose>{about.arc.lede}</Prose>
        <ol className="m-0 mb-[15px] grid list-none gap-4 p-0">
          {milestones.map((m) => (
            <li key={m.from} className="border-l-2 border-accent pl-3.5">
              <p className={`m-0 ${kickerClass}`}>{m.from}</p>
              <h3 className="m-0 mt-0.5 font-display text-base font-bold leading-tight text-ink">{m.title}</h3>
              <p className="m-0 mt-1 text-[13.5px] leading-[1.55] text-muted">{m.detail}</p>
            </li>
          ))}
        </ol>
        <p className={`m-0 mb-1 ${kickerClass}`}>{profileCopy.education}</p>
        <Education degrees={education} />
      </section>

      <section className="border-t border-line pt-4">
        <p className={`m-0 mb-1 ${kickerClass}`}>{lead.eyebrow}</p>
        <SectionHeading>{lead.statement}</SectionHeading>
        <Prose>{lead.context}</Prose>
        <Figures figures={lead.figures} />
        <GrowthBars />
      </section>

      <section className="mt-[17px] border-t border-line pt-4">
        <p className={`m-0 mb-1 ${kickerClass}`}>{build.eyebrow}</p>
        <SectionHeading>{build.statement}</SectionHeading>
        <Figures figures={build.figures} />
        <Prose>{build.context}</Prose>
      </section>

      <div className="mt-5 border-t border-line pt-[13px]">
        <a href={site.resumePath} download className="glass hud-btn hud-btn-primary">
          {resumeLabel}
        </a>
      </div>
    </>
  )
}
