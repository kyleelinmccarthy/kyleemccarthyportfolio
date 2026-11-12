import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { constellations, night } from '@/content/sky'
import type { District, Place } from '@/content/types'
import { LABELS_ID, constellationLabelId, districtLabelId, labelId } from '@/lib/world/labels'
import { districtHref, placeHref } from '@/lib/world/route'

/** One map callout: a pin on the anchor, a leader line up from it, and a tag with two lines. */
function Callout({ id, href, color, district, name, note }: { id: string; href: string; color: string; district?: boolean; name: string; note: string }) {
  return (
    <Link
      id={id}
      href={href}
      prefetch={false}
      className={district ? 'lm lm-district' : 'lm'}
      style={{ '--c': color } as CSSProperties}
    >
      <span aria-hidden className="lm-stem" />
      {/* The space keeps the two lines apart in the link's accessible name. */}
      <span className="lm-tag">
        <span className="lm-name">{name}</span> <span className="lm-note">{note}</span>
      </span>
      <span aria-hidden className="lm-pin" />
    </Link>
  )
}

/** A constellation's name on the night sky: plain text, not a link, so never focused or pressed. */
function SkyName({ id, name }: { id: string; name: string }) {
  return (
    <span id={id} className="lm lm-const" style={{ '--c': night.constellationLabel } as CSSProperties}>
      <span className="lm-const-name">{name}</span>
    </span>
  )
}

/**
 * The map's labels, as real links: one per place, to its page, and one per
 * district, to its island. They sit over the canvas, and only while it runs;
 * the canvas (`LabelProjector`) pins each to the planet and shows or hides it.
 * Until then, every one is hidden. From afar a place's label is its pin alone,
 * not a link to press or tab to, until its landmark is hovered (see `.lm` in
 * globals.css); the districts' labels and the index are the way in from there.
 * The constellations' names are here too, as plain text on the sky by night;
 * hidden, like every label, they are out of the accessibility tree.
 *
 * The layer is a navigation landmark ("Places on the map") only while some
 * label in it can be seen; the canvas gives it the role then (`LABELS_NAME`),
 * so an empty one is never announced. Until then it is a plain box.
 */
export function Labels({ districts, places }: { districts: District[]; places: Place[] }): ReactNode {
  const colorOf = (id: string) => districts.find((d) => d.id === id)?.color ?? ''
  return (
    <div id={LABELS_ID}>
      {places.map((place) => (
        <Callout
          key={place.id}
          id={labelId(place.id)}
          href={placeHref(place.id)}
          color={colorOf(place.district)}
          name={place.name}
          note={place.descriptor}
        />
      ))}
      {districts.map((district) => {
        const count = places.filter((place) => place.district === district.id).length
        return (
          <Callout
            key={district.id}
            id={districtLabelId(district.id)}
            href={districtHref(district.id)}
            color={district.color}
            district
            name={district.name}
            note={`${String(count).padStart(2, '0')} places · ${district.blurb}`}
          />
        )
      })}
      {constellations.map((c) => (
        <SkyName key={c.name} id={constellationLabelId(c.name)} name={c.name} />
      ))}
    </div>
  )
}
