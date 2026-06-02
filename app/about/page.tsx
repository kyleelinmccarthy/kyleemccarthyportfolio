import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { AboutScene } from '@/components/scenes'
import { journey } from '@/content/journey'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <SectionPage title="About">
      <AboutScene />
      <ul className="mx-auto mt-12 grid max-w-xl gap-2 text-center sm:max-w-none sm:grid-cols-2 sm:text-left">
        {journey.about.milestones.map((m) => (
          <li key={m} className="font-sans text-fg-muted">
            <span className="mr-2 text-accent" aria-hidden="true">
              ◦
            </span>
            {m}
          </li>
        ))}
      </ul>
    </SectionPage>
  )
}
