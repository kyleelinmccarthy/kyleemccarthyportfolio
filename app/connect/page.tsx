import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { Postbox } from '@/components/rooms/Postbox'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { contact } from '@/content/contact'
import { journey } from '@/content/journey'

export const metadata: Metadata = { title: 'Let’s Talk' }

export default function ConnectPage() {
  return (
    <SectionPage title="Let’s talk">
      <div className="max-w-2xl">
        <RevealOnActive>
          <h2 className="font-serif text-fluid-hero text-fg">{journey.talk.heading}</h2>
        </RevealOnActive>
      </div>
      <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="max-w-prose space-y-5 font-sans text-lg leading-relaxed text-fg-muted">
          {contact.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <Postbox />
      </div>
    </SectionPage>
  )
}
