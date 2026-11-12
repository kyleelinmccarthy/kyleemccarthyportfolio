import { projects } from '@/content/projects'
import type { CollectionItem, Place, PlaceContent } from '@/content/types'
import { Kind, SectionHeading } from './parts'

/** An item is either a project (shown by its name and headline) or a named entry with its own summary. */
function describe(item: CollectionItem): { name: string; text: string } {
  if ('name' in item) return { name: item.name, text: item.summary }
  const project = projects.find((p) => p.slug === item.project)
  if (!project) throw new Error(`Collection item points at unknown project "${item.project}"`)
  return { name: project.name, text: project.headline }
}

/** A short list of things in progress. */
export function CollectionPanel({
  place,
  content,
}: {
  place: Place
  content: Extract<PlaceContent, { kind: 'collection' }>
}) {
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      <ul className="m-0 list-none border-t border-line p-0">
        {content.items.map((item) => {
          const { name, text } = describe(item)
          return (
            <li key={name} className="border-b border-line py-4">
              <SectionHeading>{name}</SectionHeading>
              <p className="m-0 text-[14.5px] leading-[1.62] text-muted">{text}</p>
            </li>
          )
        })}
      </ul>
    </>
  )
}
