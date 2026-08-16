import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { Figure } from '@/components/primitives/Figure'
import { GrowthBars } from '@/components/sections/GrowthBars'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { journey } from '@/content/journey'

export const metadata: Metadata = { title: 'How I Lead' }

export default function LeadershipPage() {
  return (
    <SectionPage title="How I lead">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <RevealOnActive>
            <p className="font-sans text-label uppercase text-accent">{journey.lead.eyebrow}</p>
            <h2 className="mt-4 max-w-xl font-serif text-fluid-h2 text-fg">{journey.lead.statement}</h2>
          </RevealOnActive>
          <RevealOnActive index={1}>
            <p className="mt-5 max-w-xl font-sans leading-relaxed text-fg-muted">{journey.lead.context}</p>
          </RevealOnActive>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {journey.lead.figures.map((f, i) => (
              <Figure key={f.label} value={f.value} label={f.label} index={i + 2} />
            ))}
          </div>
        </div>
        <GrowthBars />
      </div>
    </SectionPage>
  )
}
