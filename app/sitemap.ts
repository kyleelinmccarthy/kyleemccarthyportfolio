import type { MetadataRoute } from 'next'
import { site } from '@/content/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/about', '/leadership', '/value', '/work', '/connect']
  return paths.map((p) => ({
    url: `${site.url}${p}`,
    changeFrequency: 'monthly',
    priority: p === '' ? 1 : 0.7,
  }))
}
