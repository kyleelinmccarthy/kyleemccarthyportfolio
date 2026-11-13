'use client'

import { useEffect, useState } from 'react'
import { PET_BUBBLE_ID } from '@/lib/world/pets'
import { pets, usePets } from './petStore'

/** The id of the pets' live region: what a screen reader hears a pressed pet say. */
export const PET_SAID_ID = 'pet-said'
/** How long a pet's word stays over it, in milliseconds. */
export const SAY_MS = 1800

/**
 * What the pets put over the page at their place, while the canvas draws
 * them: the small bubble a pressed pet says its word in (pinned over its head
 * by `PetBubbleProjector`, hidden from assistive technology), and a polite
 * live region of its own that tells a screen reader the word ("A dog says:
 * Woof!"). The region is apart from the bubble, which moves and hides, and
 * apart from the guide's (`GuideLayer`), which it never writes to. The same
 * word said twice running is told twice: the second time the text changes
 * by an invisible space. The word is taken down after `SAY_MS`, and when the
 * visitor leaves.
 */
export function PetLayer() {
  const { said } = usePets()
  const [told, setTold] = useState('')
  useEffect(() => pets.load(), [])
  useEffect(() => () => pets.quiet(), [])
  useEffect(() => {
    if (!said) return
    const text = `${said.who} says: ${said.word}`
    setTold((before) => (before === text ? `${text}\u00a0` : text))
    const id = window.setTimeout(() => pets.quiet(), SAY_MS)
    return () => window.clearTimeout(id)
  }, [said])
  return (
    <>
      <div id={PET_SAID_ID} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {told}
      </div>
      <div id={PET_BUBBLE_ID} className="pet-bubble" aria-hidden data-away="" data-quiet={said ? undefined : ''}>
        {said?.word}
      </div>
    </>
  )
}
