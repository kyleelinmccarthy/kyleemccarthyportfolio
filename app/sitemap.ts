import type { MetadataRoute } from 'next'
import { site } from '@/content/site'
import { places } from '@/content/world'
import { placeHref } from '@/lib/world/route'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', ...places.map((place) => placeHref(place.id))]
  return paths.map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }))
}
