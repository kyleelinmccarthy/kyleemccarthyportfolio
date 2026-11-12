import { offTheClock } from '@/content/interests'
import type { Place } from '@/content/types'
import { Kind, Prose, SectionHeading } from './parts'

/** What she does away from a screen. */
export function InterestsPanel({ place }: { place: Place }) {
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      {offTheClock.items.map((item) => (
        <section key={item.title} className="border-t border-line pt-4">
          <SectionHeading>{item.title}</SectionHeading>
          <Prose>{item.body}</Prose>
        </section>
      ))}
    </>
  )
}
