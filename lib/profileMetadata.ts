import type { Metadata } from 'next'
import type { ProfileSectionId } from '@/content/profile'
import { profileSection } from '@/lib/profile'
import { shareImage } from '@/lib/shareImage'

/**
 * A profile section's page metadata: its title, description and own address,
 * with the site's share image (a page that sets its own openGraph loses the
 * one it would inherit). Server only, apart from lib/profile.ts, so the share
 * image's colours never reach the browser with the header.
 */
export function profileMetadata(id: ProfileSectionId): Metadata {
  const { label, href, description } = profileSection(id)
  return {
    title: label,
    description,
    alternates: { canonical: href },
    openGraph: { type: 'profile', url: href, title: label, description, images: [shareImage] },
    twitter: { card: 'summary_large_image', title: label, description, images: [shareImage.url] },
  }
}
