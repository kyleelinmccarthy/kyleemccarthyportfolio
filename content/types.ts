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
  liveUrl?: string // absence => abstract palette panel, not a screenshot
  /** For projects with no standalone site (e.g. embedded widgets): a short note,
   *  surfaced as an info tooltip, explaining where the work can be seen live. */
  embedNote?: string
  /** Filename in /public/screenshots for projects we captured; falls back to a panel. */
  screenshot?: string
  isPersonal: boolean
}

export interface Milestone {
  /** Optional real year/label; phase label used when absent. */
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
