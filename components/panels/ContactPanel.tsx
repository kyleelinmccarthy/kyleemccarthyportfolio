import { ContactForm } from '@/components/sections/ContactForm'
import { contact } from '@/content/contact'
import type { Place } from '@/content/types'
import { Kind, Lead } from './parts'

/** The letter box: one line of reassurance, then the form. */
export function ContactPanel({ place }: { place: Place }) {
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      <Lead>{contact.mailbox.hint}</Lead>
      <ContactForm rows={4} />
    </>
  )
}
