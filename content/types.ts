/** Shared content interfaces. Components depend on these, not on concrete data (DIP). */

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
  /** One-line headline shown before the card is expanded (keeps text light). */
  headline: string
  /** Optional: left out when Kylee has not said why she built the project. */
  problem?: string
  built: string
  outcome?: string // some in-progress projects have none
  /** Public site to link to. What the card *shows* is driven by `media`:
   *  no media => ProjectVisual falls back to an abstract palette panel. */
  liveUrl?: string
  /** The words on the link to `liveUrl`. Defaults to "Visit". */
  liveLabel?: string
  /** For projects with no standalone site (e.g. embedded widgets): a short note,
   *  surfaced as an info tooltip, explaining where the work can be seen live. */
  embedNote?: string
  status: ProjectStatus
  /** Overrides the default label for `status`, e.g. "Coming soon to Steam". */
  statusLabel?: string
  /** Short label/value pairs shown alongside the project. */
  facts?: Array<{ label: string; value: string }>
  media?: { hero: MediaItem; gallery?: MediaItem[] }
  /** Hero is Playwright-captured from liveUrl rather than imported from a repo. */
  autoCapture?: boolean
  /** Button text to click before capturing, e.g. to enter a demo past a login screen. */
  captureClick?: string
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

/* ── The tiny planet ─────────────────────────────────────────────────────── */

export type DistrictId = 'works' | 'frenzy' | 'hours' | 'studio' | 'home'

/** A point on the planet, in degrees. */
export interface LatLon {
  lat: number
  lon: number
}

export interface District {
  id: DistrictId
  name: string
  blurb: string
  color: string
  center: LatLon
  /** Angular radius of the district, in degrees. */
  radius: number
}

export type ModelKey =
  | 'generic' | 'lighthouse' | 'towers' | 'signal-mast' | 'big-top' | 'civic' | 'construction'
  | 'studio' | 'playground' | 'billboard' | 'alley' | 'castle' | 'piggy-bank' | 'tattoo-shop'
  | 'easel' | 'drafting-table' | 'house' | 'flags' | 'mountain' | 'postbox'

export type CollectionItem = { project: string } | { name: string; summary: string }

export type PlaceContent =
  | { kind: 'project'; slug: string }
  | { kind: 'collection'; items: CollectionItem[] }
  | { kind: 'about' }
  | { kind: 'principles' }
  | { kind: 'gallery'; set: 'art' | 'tattoo' }
  | { kind: 'interests' }
  | { kind: 'contact' }

export interface Place {
  id: string
  district: DistrictId
  name: string
  descriptor: string
  at: LatLon
  model: ModelKey
  height: number
  content: PlaceContent
  weather?: 'rain'
  /** The owner's picture its landmark shows (a JPEG under /media/). */
  poster?: string
  /**
   * The poster's [width, height] in pixels, as its file stores them: the
   * landmark draws the picture at this shape, so a new image of another shape
   * is never stretched. Tested against the file.
   */
  posterSize?: [number, number]
}

export type Band = 'morning' | 'afternoon' | 'evening' | 'late'
export type Theme = 'day' | 'night'
export type LookKey = 'morning' | 'afternoon' | 'evening' | 'night'

export interface SkyLook {
  top: string; mid: string; bot: string; sunCol: string; shade: string; lit: string; rim: string; atmo: string
  cloudLit: string; cloudShade: string; deep: string; sea: string; shallow: string; glint: string; city: string
  sunK: number; moonK: number; star: number; rimK: number; sunY: number; glow: number
}

export interface Constellation {
  name: string
  at: LatLon
  points: Array<[number, number]>
  lines: Array<[number, number]>
}
