import { principles } from '@/content/principles'
import type { Place } from '@/content/types'
import { Kind, Prose, SectionHeading } from './parts'

/** The three principles, in her words. */
export function PrinciplesPanel({ place }: { place: Place }) {
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      {principles.items.map((principle) => (
        <section key={principle.title} className="border-t border-line pt-4">
          <SectionHeading>{principle.title}</SectionHeading>
          <Prose>{principle.body}</Prose>
        </section>
      ))}
    </>
  )
}
