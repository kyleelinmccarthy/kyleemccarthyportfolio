import { Gallery } from '@/components/media/Gallery'
import { artAlt, artIntro, tattooAlt, tattooIntro } from '@/content/art'
import type { MediaItem, Place, PlaceContent } from '@/content/types'
import { groupArt } from '@/lib/artGroups'
import { Kind, Prose, SectionHeading } from './parts'

// Grouped by medium from the filename prefix scripts/import-art.ts bakes into
// every slug, so a new import needs no change here: drop a file in
// public/media/art with an artAlt entry and it lands in the right group.
const artGroups = groupArt(artAlt)
  .filter((group) => group.items.length > 0)
  .map((group) => ({
    label: group.label,
    items: group.items.map(({ slug, alt }): MediaItem => ({ src: `/media/art/${slug}.jpg`, alt })),
  }))

const tattooItems: MediaItem[] = Object.entries(tattooAlt).map(([slug, alt]) => ({
  src: `/media/tattoo/${slug}.jpg`,
  alt,
}))

/** The art, a section per medium, or the tattoo designs as one set. Both open the lightbox. */
export function GalleryPanel({
  place,
  content,
}: {
  place: Place
  content: Extract<PlaceContent, { kind: 'gallery' }>
}) {
  if (content.set === 'tattoo') {
    return (
      <>
        <Kind>{place.descriptor}</Kind>
        <Prose>{tattooIntro.lede}</Prose>
        <Gallery items={tattooItems} label={tattooIntro.heading} />
      </>
    )
  }
  return (
    <>
      <Kind>{place.descriptor}</Kind>
      <Prose>{artIntro.lede}</Prose>
      {artGroups.map((group) => (
        <section key={group.label} className="mt-5 border-t border-line pt-4">
          <SectionHeading>{group.label}</SectionHeading>
          <Gallery items={group.items} label={group.label} />
        </section>
      ))}
    </>
  )
}
