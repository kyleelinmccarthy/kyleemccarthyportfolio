'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { guide } from '@/content/guide'
import { BUBBLE_ID } from '@/lib/world/bubble'
import { guideSays, type GuideAction, type GuideRoute, type GuideSays } from '@/lib/world/guide'
import { GUIDE_FACE } from '@/lib/guests'
import { companions, useCompanions } from './companionStore'
import { useTheme } from './ThemeProvider'

/** The id of the button that opens the character picker: focus comes back to it when the picker closes. */
export const CHANGE_CHARACTER_ID = 'change-character'

/** A key for a route, so a new route (and only a new route) asks the guide again. */
const routeKey = (route: GuideRoute) => (route.kind === 'overview' ? 'overview' : `${route.kind}:${route.id}`)

/**
 * What the guide says where the visitor is (`guideSays`), and whether its
 * greeting was closed. The line before is taken once per route, so the line
 * for a route stays the same when only the theme or the stored choices change
 * (an idle line does not move on; the greeting only turns from day to night).
 */
export function useGuideLine(route: GuideRoute): { says: GuideSays | null; closed: boolean; close(): void } {
  const { hintsOff, greeted, ready } = useCompanions()
  const { theme } = useTheme()
  const key = routeKey(route)
  // The first route this page showed, and whether the visitor has moved on from it.
  const first = useRef(key)
  const [says, setSays] = useState<GuideSays | null>(null)
  const [closed, setClosed] = useState(false)
  // The key of the last line shown, and the one shown before this route: what this route's line follows.
  const last = useRef<string | null>(null)
  // Taken once per route: the line before, and whether this is the visitor's first arrival (closing the greeting does not turn it into an idle line).
  const before = useRef<{ route: string; previous: string | null; first: boolean } | null>(null)

  // Moving on from the first route means the greeting has been given.
  useEffect(() => {
    if (key !== first.current) companions.greet()
    setClosed(false)
  }, [key])

  useEffect(() => {
    if (!ready) return
    if (before.current?.route !== key) before.current = { route: key, previous: last.current, first: !greeted && key === first.current }
    const next = guideSays({ route, firstArrival: before.current.first, theme, hintsOn: !hintsOff, previous: before.current.previous })
    if (next) last.current = next.key
    setSays(next)
    // `route` is read through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, greeted, hintsOff, theme])

  return {
    says,
    closed,
    close() {
      companions.greet()
      setClosed(true)
    },
  }
}

/** One thing the bubble offers: a link along the tour, or the button that closes the greeting. */
function Action({ action, onAlone }: { action: GuideAction; onAlone(): void }) {
  const arrow = action.kind === 'next' || action.kind === 'start' ? ' →' : action.kind === 'back' ? '← ' : ''
  if (!action.href) {
    return (
      <button type="button" className="guide-action" onClick={onAlone}>
        {action.label}
      </button>
    )
  }
  return (
    <Link href={action.href} prefetch={false} className={`guide-action${action.kind === 'start' || action.kind === 'next' ? ' guide-action-primary' : ''}`}>
      {action.kind === 'back' && <span aria-hidden>{arrow}</span>}
      {action.label}
      {action.detail && <span className="sr-only">: {action.detail}</span>}
      {(action.kind === 'next' || action.kind === 'start') && <span aria-hidden>{arrow}</span>}
    </Link>
  )
}

/** At or below this width a docked bubble starts folded at a place, so it does not cover the view. */
const FOLDS_BELOW = 820

/** Whether the screen is a phone's. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(`(max-width: ${FOLDS_BELOW}px)`)
    const read = () => setNarrow(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])
  return narrow
}

/** A small round picture of the guide's face. */
function Face() {
  return <Image src={GUIDE_FACE} alt="" width={28} height={28} unoptimized className="guide-face" />
}

/**
 * The guide's speech bubble, as the eye sees it (a screen reader hears her
 * from the layer's live region, `GuideLayer`): her line as real text and what
 * it offers as real links and buttons, with the "Change your character" button
 * and the button that hides her hints for the visit at its corner. At a place
 * the canvas pins it over her head (`BubbleProjector`); over the planet, where
 * she cannot be seen, or while it is folded, it is docked in the HUD
 * (`data-docked`, and `data-pin="off"` tells the canvas not to pin it). On a
 * phone at a place it starts folded to a chip with her face, and opens on a
 * tap. With hints hidden it is that chip alone, which brings them back.
 */
export function GuideBubble({ route, says, closed, onAlone }: { route: GuideRoute; says: GuideSays | null; closed: boolean; onAlone(): void }) {
  const { hintsOff } = useCompanions()
  const narrow = useNarrow()
  const key = routeKey(route)
  // Folded or open, by the visitor's choice; until they choose, folded on a phone at a place. A new route asks again.
  const [chosen, setChosen] = useState<{ route: string; folded: boolean } | null>(null)
  const folded = chosen?.route === key ? chosen.folded : narrow && route.kind === 'place'
  const quiet = hintsOff || says === null || closed
  const chip = quiet || folded
  // On a phone there is seldom room beside her for the bubble: it stays in the dock, folded or open.
  const docked = chip || narrow || says?.anchor === 'hud'
  return (
    <div
      id={BUBBLE_ID}
      className="guide-bubble"
      data-where={route.kind === 'place' ? 'place' : 'overview'}
      data-docked={docked ? '' : undefined}
      data-pin={docked ? 'off' : undefined}
      data-chip={chip ? '' : undefined}
    >
      {chip ? (
        hintsOff ? (
          <button type="button" className="guide-chip" onClick={() => companions.setHints(true)}>
            <Face />
            <span>{guide.controls.show}</span>
          </button>
        ) : says && !closed ? (
          <button type="button" className="guide-chip" aria-expanded={false} onClick={() => setChosen({ route: key, folded: false })}>
            <Face />
            <span>{guide.controls.open}</span>
          </button>
        ) : (
          <span className="guide-chip guide-chip-plain">
            <Face />
          </span>
        )
      ) : (
        says && (
          <>
            <p key={says.key} className="guide-line">
              {says.line.title && <strong className="guide-title">{says.line.title} </strong>}
              {says.line.text}
              {says.line.aside && <span className="guide-aside"> {says.line.aside}</span>}
            </p>
            {says.actions.length > 0 && (
              <div className="guide-actions">
                {says.actions.map((action) => (
                  <Action key={action.kind} action={action} onAlone={onAlone} />
                ))}
              </div>
            )}
          </>
        )
      )}
      <div className="guide-tools">
        <button id={CHANGE_CHARACTER_ID} type="button" aria-haspopup="dialog" aria-label={guide.controls.change} title={guide.controls.change} className="guide-tool" onClick={() => companions.openPicker()}>
          <svg aria-hidden viewBox="0 0 16 16" width="15" height="15">
            <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2.5 14.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {!chip && narrow && (
          <button type="button" className="guide-tool" aria-expanded aria-label={guide.controls.fold} title={guide.controls.fold} onClick={() => setChosen({ route: key, folded: true })}>
            <span aria-hidden>▾</span>
          </button>
        )}
        {!chip && (
          <button type="button" className="guide-tool" aria-label={guide.controls.hide} title={guide.controls.hide} onClick={() => companions.setHints(false)}>
            <span aria-hidden>✕</span>
          </button>
        )}
      </div>
    </div>
  )
}
