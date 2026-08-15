/** Shared content interfaces. Components depend on these, not on concrete data (DIP). */

export interface NavItem {
  label: string
  href: string
}

export interface Stat {
  value: string // display form, e.g. "200+", "$1,600+/yr"
  label: string
  description?: string
}

export interface Service {
  number: string // "01"
  title: string
  body: string
}

export type ProjectCategory =
  | 'Client Portals'
  | 'Internal Tools'
  | 'Marketing & Web'
  | 'Personal'
  | 'Games'

/** One image with its accessible description. */
export interface MediaItem {
  /** Path under /media/, e.g. "/media/kingdoms-and-crowns/hero.jpg" */
  src: string
  /** Required — axe runs in CI, so an empty alt fails the build. */
  alt: string
  caption?: string
}

export type ProjectStatus =
  | 'production'
  | 'releasing'
  | 'building'
  | 'beta'
  | 'concept'

export interface Project {
  slug: string
  name: string
  descriptor: string // "Client Portal · Built in 6 Weeks"
  category: ProjectCategory
  /** One-line headline shown before the card is expanded (keeps text light). */
  headline: string
  problem: string
  built: string
  outcome?: string // some in-progress projects have none
  /** Public site to link to. What the card *shows* is driven by `media`:
   *  no media => ProjectVisual falls back to an abstract palette panel. */
  liveUrl?: string
  /** For projects with no standalone site (e.g. embedded widgets): a short note,
   *  surfaced as an info tooltip, explaining where the work can be seen live. */
  embedNote?: string
  status: ProjectStatus
  media?: { hero: MediaItem; gallery?: MediaItem[] }
  /** Hero is Playwright-captured from liveUrl rather than imported from a repo. */
  autoCapture?: boolean
  /** Resume-grounded tech chips, rendered by StackChips on the project cards. */
  stack?: string[]
  isPersonal: boolean
}

export interface Milestone {
  /** Real month/year from the résumé, e.g. "Mar 2015". */
  marker: string
  title: string
  detail: string
}

export interface Principle {
  title: string
  body: string
}

export interface InquiryOption {
  value: string
  label: string
}
