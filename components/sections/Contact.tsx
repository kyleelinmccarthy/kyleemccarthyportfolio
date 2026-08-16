import { Section } from '@/components/primitives/Section'
import { Reveal } from '@/components/primitives/Reveal'
import { ContactForm } from './ContactForm'
import { Mailbox } from '@/components/rooms/Mailbox'
import { contact } from '@/content/contact'

export function Contact() {
  return (
    <Section id="contact" shapes>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal>
          <div className="max-w-prose space-y-5 font-sans text-lg leading-relaxed text-fg-muted">
            {contact.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <ul className="space-y-2 pt-2 font-sans text-base">
              <li>
                <a
                  href={`mailto:${contact.options.email}`}
                  className="font-semibold text-accent underline-offset-4 hover:underline"
                >
                  {contact.options.email}
                </a>
              </li>
              <li>
                <a
                  href={contact.options.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent underline-offset-4 hover:underline"
                >
                  {contact.options.linkedinLabel}
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <Mailbox>
            <ContactForm />
          </Mailbox>
        </Reveal>
      </div>
    </Section>
  )
}
