import type { ComponentType } from 'react'
import { caseStudies } from '@/content/caseStudies'
import { projects } from '@/content/projects'
import type { Place, PlaceContent } from '@/content/types'
import { AboutPanel } from './AboutPanel'
import { CollectionPanel } from './CollectionPanel'
import { ContactPanel } from './ContactPanel'
import { GalleryPanel } from './GalleryPanel'
import { InterestsPanel } from './InterestsPanel'
import { PrinciplesPanel } from './PrinciplesPanel'
import { ProjectPanel } from './ProjectPanel'

type PanelProps<K extends PlaceContent['kind']> = { place: Place; content: Extract<PlaceContent, { kind: K }> }

/** Looks the project and its case study up, so ProjectPanel is handed everything and reads nothing. */
function ProjectEntry({ content }: PanelProps<'project'>) {
  const project = projects.find((p) => p.slug === content.slug)
  if (!project) throw new Error(`Place points at unknown project "${content.slug}"`)
  return <ProjectPanel project={project} study={caseStudies.find((c) => c.slug === content.slug)} />
}

/** One panel per kind of place. Adding a kind to `PlaceContent` is a type error until it has an entry here. */
export const PANELS: { [K in PlaceContent['kind']]: ComponentType<PanelProps<K>> } = {
  project: ProjectEntry,
  collection: CollectionPanel,
  about: AboutPanel,
  principles: PrinciplesPanel,
  gallery: GalleryPanel,
  interests: InterestsPanel,
  contact: ContactPanel,
}

/** The body of a place's panel. The shell around it supplies the name, district and close link. */
export function PlacePanelBody({ place }: { place: Place }) {
  // TypeScript cannot correlate `kind` with `content` through an index, so
  // widen once here; PANELS is what guarantees each pair matches.
  const Panel = PANELS[place.content.kind] as ComponentType<{ place: Place; content: PlaceContent }>
  return <Panel place={place} content={place.content} />
}
