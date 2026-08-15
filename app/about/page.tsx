import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { AboutScene } from '@/components/scenes'
import { milestones, education } from '@/content/timeline'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <SectionPage title="About">
      <AboutScene />
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
    </SectionPage>
  )
}
