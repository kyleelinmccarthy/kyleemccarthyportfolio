import { resumeLabel } from '@/content/about'
import { profileCopy, profileSections, type ProfileSection, type ProfileSectionId } from '@/content/profile'
import type { Site } from '@/content/site'
import type { Milestone } from '@/content/types'

/**
 * The profile's pure parts: which section a path opens, how a role's dates and
 * a link read. No DOM, no React. Each page's metadata is in profileMetadata.ts.
 */

/** The section with this id. Every id has one (`profileSections` is checked by the content tests). */
export function profileSection(id: ProfileSectionId): ProfileSection {
  const section = profileSections.find((s) => s.id === id)
  if (!section) throw new Error(`No profile section "${id}"`)
  return section
}

/** The section a pathname opens, or null for any other page. A trailing slash is allowed. */
export function profileSectionFromPath(pathname: string | null | undefined): ProfileSectionId | null {
  if (!pathname) return null
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return profileSections.find((s) => s.href === path)?.id ?? null
}

/** A role's span, as the résumé writes it: "Nov 2019 – Nov 2022", or "Nov 2022 – Present". */
export function roleDates(role: Pick<Milestone, 'from' | 'to'>): string {
  return `${role.from} – ${role.to ?? profileCopy.present}`
}

/** The roles, the one she holds now first. A copy: the order the data keeps is the Home panel's. */
export function newestFirst<T>(roles: readonly T[]): T[] {
  return [...roles].reverse()
}

/** A web address as people say it: no scheme, no "www.", no trailing slash. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

export interface ContactLink {
  id: 'email' | 'linkedin' | 'github' | 'resume'
  /** What it is, beside it. */
  label: string
  href: string
  /** What the link says. */
  text: string
  /** Opens another site, in a new tab. */
  external: boolean
  /** A file to save (the résumé). */
  download: boolean
}

/** The ways to reach her, in the order the panel lists them. */
export function contactLinks(site: Pick<Site, 'email' | 'linkedin' | 'github' | 'resumePath'>): ContactLink[] {
  const labels = profileCopy.contact
  return [
    { id: 'email', label: labels.email, href: `mailto:${site.email}`, text: site.email, external: false, download: false },
    { id: 'linkedin', label: labels.linkedin, href: site.linkedin, text: displayUrl(site.linkedin), external: true, download: false },
    { id: 'github', label: labels.github, href: site.github, text: displayUrl(site.github), external: true, download: false },
    { id: 'resume', label: labels.resume, href: site.resumePath, text: resumeLabel, external: false, download: true },
  ]
}

/** What an external link carries: a new tab, with no way back into this page and no referrer. */
export const EXTERNAL_LINK = { target: '_blank', rel: 'noopener noreferrer' } as const
