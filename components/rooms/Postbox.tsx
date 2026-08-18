'use client'

import { useState } from 'react'
import { Mailbox } from './Mailbox'
import { ContactForm } from '@/components/sections/ContactForm'

/**
 * The mailbox and the notebook page you write on, together.
 *
 * They were assembled at each of the three call sites, which meant the box had
 * no way of knowing the letter had gone — the form owns that fact. One
 * component holds both and the moment between them: on a successful send the
 * flag goes up and a sheet of paper flies into the slot.
 */
export function Postbox({ rows }: { rows?: number }) {
  const [posted, setPosted] = useState(false)
  return (
    <Mailbox posted={posted}>
      <ContactForm rows={rows} onSent={() => setPosted(true)} />
    </Mailbox>
  )
}
