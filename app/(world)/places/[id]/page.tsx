import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/hud/Header'
import { PanelShell } from '@/components/hud/PanelShell'
import { TourBar } from '@/components/hud/TourBar'
import { PlacePanelBody } from '@/components/panels/registry'
import { projects } from '@/content/projects'
import type { Place } from '@/content/types'
import { districts, placeById, places } from '@/content/world'
import { shareImage } from '@/lib/shareImage'
import { placeHref } from '@/lib/world/route'

export const dynamicParams = false

export function generateStaticParams() {
  return places.map((place) => ({ id: place.id }))
}

type Props = { params: Promise<{ id: string }> }

function projectOf(place: Place) {
  const { content } = place
  return content.kind === 'project' ? projects.find((project) => project.slug === content.slug) : undefined
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const place = placeById(id)
  if (!place) return {}
  const project = projectOf(place)
  const description = project?.headline ?? place.descriptor
  // A project place shows its hero; every other place falls back to the site's share image.
  const hero = project?.media?.hero
  const image = hero ? { url: hero.src, alt: hero.alt } : shareImage
  const url = placeHref(place.id)
  return {
    title: place.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: place.name,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: place.name,
      description,
      images: [image.url],
    },
  }
}

export default async function PlacePage({ params }: Props) {
  const { id } = await params
  const place = placeById(id)
  const district = districts.find((d) => d.id === place?.district)
  if (!place || !district) notFound()

  return (
    <>
      <Header home={false} />
      <main id="main">
        <PanelShell place={place} district={district}>
          <PlacePanelBody place={place} />
        </PanelShell>
      </main>
      <TourBar placeId={place.id} />
    </>
  )
}
