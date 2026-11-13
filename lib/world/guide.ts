import { guide } from '@/content/guide'
import type { Theme } from '@/content/types'
import { placeById, tourOrder } from '@/content/world'
import { placeHref } from './route'
import { tourIndex, tourStep } from './tour'

/*
 * What the guide says and when. Pure: everything it depends on comes in as an
 * argument (the route, whether this is the visitor's first arrival, the
 * theme, whether hints are on, the line shown last, and for her wave the
 * time), so every case is a unit test. The words are content
 * (`content/guide.ts`); this decides which, and what the bubble offers.
 */

/** Where the visitor is: the planet from afar, turned to a district, or at a place. */
export type GuideRoute = { kind: 'overview' } | { kind: 'district'; id: string } | { kind: 'place'; id: string }

/** Something the bubble offers: a link (to the next stop, the first) or a button that closes it. */
export interface GuideAction {
  kind: 'start' | 'alone' | 'back' | 'next' | 'finish'
  /** The words on it. */
  label: string
  /** Where a link goes. A button (`alone`) has none. */
  href?: string
  /** For a screen reader, after the label: the place a link goes to. */
  detail?: string
}

/** A line: an optional first sentence apart (her hello), the line itself, and an aside after it (at the last stop). */
export interface GuideLine {
  title?: string
  text: string
  aside?: string
}

/**
 * What the guide says now: the line and what it offers, where the bubble
 * stands (by her, at a place; in the HUD over the planet, where she may be
 * round the far side), a key naming the line (so a line can be told from the
 * last), and whether it changed (a screen reader hears it only then).
 */
export interface GuideSays {
  line: GuideLine
  actions: GuideAction[]
  anchor: 'figure' | 'hud'
  key: string
  changed: boolean
}

export interface GuideInput {
  route: GuideRoute
  /** The visitor's first arrival on the planet this visit: she greets them. */
  firstArrival: boolean
  /** The site's theme: her greeting is by day or by night. */
  theme: Theme
  /** Hints are on (the visitor has not hidden them this visit). */
  hintsOn: boolean
  /** The key of the line shown last, if any. */
  previous: string | null
}

/** The words the guide uses, as `content/guide.ts` has them: passed in so a test can use its own. */
export type GuideCopy = typeof guide

const placeName = (id: string) => placeById(id)?.name ?? id

/** The tour's links from a stop: back (but not from the first), and next, or at the last stop, back to the planet. */
function tourActions(id: string, copy: GuideCopy): GuideAction[] {
  const at = tourIndex(id)
  if (at < 0) return []
  const back = tourStep(id, -1)
  const next = tourStep(id, 1)
  const actions: GuideAction[] = []
  if (at > 0) actions.push({ kind: 'back', label: copy.tour.back, href: placeHref(back), detail: placeName(back) })
  if (at < tourOrder.length - 1) actions.push({ kind: 'next', label: copy.tour.next, href: placeHref(next), detail: placeName(next) })
  else actions.push({ kind: 'finish', label: copy.tour.finish, href: '/' })
  return actions
}

/** The idle line after `previous`: the first, or the one after the idle line shown last, round in turn. */
function idleAfter(previous: string | null, copy: GuideCopy): { key: string; text: string } {
  const lines = copy.idle
  const last = previous?.startsWith('idle:') ? Number(previous.slice(5)) : -1
  const i = Number.isInteger(last) && last >= 0 ? (last + 1) % lines.length : 0
  return { key: `idle:${i}`, text: lines[i] ?? '' }
}

/**
 * What the guide says, or null when she says nothing: hints are off, or the
 * place has no line.
 *
 * - Over the planet or a district, on the visitor's first arrival: her
 *   greeting for the theme, offering the tour (a link to its first stop) or a
 *   look round alone. Anchored in the HUD.
 * - Over the planet or a district afterwards: an idle line, taking turns, so
 *   coming back does not say the same thing twice running. In the HUD.
 * - At a place: its line, with her hello first if the visitor landed there
 *   first; the tour's links (back, and next or back to the planet), the same
 *   hrefs the tour bar uses (`tourStep`); at the last stop her last-stop
 *   aside. By her.
 */
export function guideSays(input: GuideInput, copy: GuideCopy = guide): GuideSays | null {
  if (!input.hintsOn) return null
  const { route, previous } = input
  const says = (key: string, line: GuideLine, actions: GuideAction[], anchor: GuideSays['anchor']): GuideSays => ({
    key,
    line,
    actions,
    anchor,
    changed: key !== previous,
  })

  if (route.kind === 'place') {
    const text = copy.places[route.id]
    if (!text) return null
    const last = tourIndex(route.id) === tourOrder.length - 1
    const line: GuideLine = { text }
    if (input.firstArrival) line.title = copy.hello
    if (last) line.aside = copy.tour.last
    return says(`place:${route.id}${input.firstArrival ? ':hello' : ''}`, line, tourActions(route.id, copy), 'figure')
  }

  if (input.firstArrival) {
    const first = tourOrder[0]!
    return says(
      `greeting:${input.theme}`,
      { text: copy.greeting[input.theme] },
      [
        { kind: 'start', label: copy.tour.start, href: placeHref(first), detail: placeName(first) },
        { kind: 'alone', label: copy.tour.alone },
      ],
      'hud',
    )
  }
  const idle = idleAfter(previous, copy)
  return says(idle.key, { text: idle.text }, [], 'hud')
}

/**
 * What a screen reader is told the guide says: her line as one plain sentence
 * or more (her hello, the line, the aside), or nothing for no line.
 */
export function spoken(says: GuideSays | null): string {
  if (!says) return ''
  return [says.line.title, says.line.text, says.line.aside].filter(Boolean).join(' ')
}

/**
 * Which line a screen reader has heard, as far as announcing goes: the line's
 * key, except that the greeting is one line whether it is said by day or by
 * night (the theme settles a moment after the page opens, or the visitor
 * switches it), so a change of theme alone is never announced again.
 */
export function announcedAs(says: GuideSays | null): string | null {
  if (!says) return null
  return says.key.startsWith('greeting:') ? 'greeting' : says.key
}

/**
 * Whether the guide's polite live region should say `next`, having last said
 * the line known as `heard` (`announcedAs`): only a new line, never the same
 * line again, never nothing (when hints are hidden she is silent, and hiding
 * them says nothing).
 */
export function shouldAnnounce(heard: string | null, next: GuideSays | null): boolean {
  const key = announcedAs(next)
  return key !== null && key !== heard
}

/** How long she waves when the visitor arrives somewhere, in seconds: long enough to be seen after the camera's flight (at most 2.4s). */
export const WAVE_SECONDS = 6

/** Whether she is still waving `now`, having started at `since` (both in seconds, on one clock). Not before she starts, and never on a clock that is not a number. */
export function isWaving(now: number, since: number | null): boolean {
  if (since === null || !Number.isFinite(now) || !Number.isFinite(since)) return false
  const t = now - since
  return t >= 0 && t < WAVE_SECONDS
}
