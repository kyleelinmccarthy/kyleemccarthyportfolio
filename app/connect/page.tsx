import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { TalkScene } from '@/components/scenes'
import { ContactForm } from '@/components/sections/ContactForm'
import { contact } from '@/content/contact'

export const metadata: Metadata = { title: 'Let’s Talk' }

export default function ConnectPage() {
  return (
    <SectionPage title="Let’s talk">
      <TalkScene />
      <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="max-w-prose space-y-5 font-sans text-lg leading-relaxed text-fg-muted">
          {contact.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <ContactForm />
      </div>
    </SectionPage>
  )
}
