'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { COVERS_LABELS, LABELS_ID, type ScreenRect, type TagSize } from '@/lib/world/labels'
import { testHooksOn } from '@/lib/world/quality'

/** Marks a covering part of the page that fades when the camera is in close. */
export const GIVES_WAY = 'data-gives-way'
/** Set on <html> while the camera is in close: the headline, greeting, role line and legend give way (globals.css). */
export const HUD_AWAY = 'data-hud-away'
/** The map readout in the frame (see `Frame`). */
export const READOUT_ID = 'view-readout'

const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E)

/** The page's layout as the labels last measured it: what covers the map, and every tag's size by label id. */
export interface Measured {
  covers: Array<{ el: Element; rect: ScreenRect; givesWay: boolean }>
  tags: Map<string, TagSize>
}

/** True for something inside the labels' layer or the readout: their own changes are not changes to the page's layout. */
const isOwn = (target: EventTarget | Node | null) => target instanceof Element && target.closest(`#${LABELS_ID}, #${READOUT_ID}`) !== null

/**
 * Measures what covers the map and every tag's size, only when they may have
 * changed: when a covering element is resized, the window is resized, the page
 * gains or loses elements (a panel opens), a transition ends (the index
 * drawer slides, the HUD fades) or the fonts arrive. Never in the frame loop,
 * and never because of the labels' own moves.
 *
 * Each covering element is observed once: a new observation always reports
 * once, so observing them all again after each measure would measure again at
 * the next rendering step, for ever.
 */
export function useLabelMeasures(): RefObject<Measured> {
  const measured = useRef<Measured>({ covers: [], tags: new Map() })

  useEffect(() => {
    let queued: number | null = null
    const observed = new Set<Element>()
    const resized = new ResizeObserver(() => soon())

    const measure = () => {
      queued = null
      if (TEST_HOOKS) window.__labelMeasures = (window.__labelMeasures ?? 0) + 1
      const covers = Array.from(document.querySelectorAll(`[${COVERS_LABELS}]`))
      measured.current.covers = covers.map((el) => ({ el, rect: el.getBoundingClientRect(), givesWay: el.hasAttribute(GIVES_WAY) }))
      for (const label of document.querySelectorAll<HTMLElement>(`#${LABELS_ID} .lm`)) {
        const tag = label.querySelector<HTMLElement>('.lm-tag')
        if (tag && tag.offsetWidth > 0) measured.current.tags.set(label.id, { width: tag.offsetWidth, height: tag.offsetHeight })
      }
      // Watch new covering elements, and stop watching ones that have gone.
      const now = new Set(covers)
      for (const el of observed) {
        if (!now.has(el)) {
          resized.unobserve(el)
          observed.delete(el)
        }
      }
      for (const el of now) {
        if (!observed.has(el)) {
          resized.observe(el)
          observed.add(el)
        }
      }
    }
    const soon = () => {
      if (queued === null) queued = window.setTimeout(measure, 0)
    }
    const changed = new MutationObserver((records) => {
      if (records.some((r) => !isOwn(r.target))) soon()
    })
    const transitioned = (e: Event) => {
      if (!isOwn(e.target)) soon()
    }
    changed.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', soon)
    document.addEventListener('transitionend', transitioned)
    void document.fonts?.ready.then(soon)
    measure()
    return () => {
      if (queued !== null) window.clearTimeout(queued)
      resized.disconnect()
      changed.disconnect()
      window.removeEventListener('resize', soon)
      document.removeEventListener('transitionend', transitioned)
    }
  }, [])

  return measured
}

/** A label whose tag waits for a tap on a touch screen: a neighbour's pin, or one that gave way to its pin. */
const TAP_TO_OPEN = `#${LABELS_ID} .lm:is([data-tier='nearby'], [data-tagless])`

/**
 * On a touch screen the first tap on a label that shows only its pin opens its
 * tag (`data-open`) and the next follows the link; a tap anywhere else closes
 * it. A mouse sees the tag on hover and the keyboard on focus, so for them a
 * click follows the link at once.
 */
export function useLabelTaps(): void {
  useEffect(() => {
    // The label a finger last pressed, if it showed only its pin then. Decided at the press: by the click, a touch's
    // emulated hover may already have shown the tag, and the label would no longer look collapsed.
    let pressed: HTMLElement | null = null
    const labelOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(`#${LABELS_ID} .lm`) : null)
    const closeAll = (except: Element | null) => {
      for (const open of document.querySelectorAll(`#${LABELS_ID} .lm[data-open]`)) if (open !== except) open.removeAttribute('data-open')
    }
    // A press anywhere but on an open label closes it: on the planet the controls take the press, so no click follows.
    const down = (e: PointerEvent) => {
      const label = labelOf(e.target)
      closeAll(label)
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen'
      pressed = touch && label && !label.hasAttribute('data-open') && label.matches(TAP_TO_OPEN) ? label : null
    }
    const tap = (e: MouseEvent) => {
      const label = labelOf(e.target)
      const opens = label !== null && label === pressed && e.detail !== 0
      pressed = null
      if (!opens || !label) return
      e.preventDefault()
      label.setAttribute('data-open', '')
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('click', tap, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('click', tap, true)
      closeAll(null)
    }
  }, [])
}

/** What the projector last set on the page: the HUD faded, the layer a landmark, and the layer itself. */
export interface ProjectorState {
  away: boolean
  landmark: boolean
  layer: HTMLElement | null
}

/**
 * When the canvas goes, nothing is left faded and the labels' layer is no
 * longer a landmark; and the projector's `state` forgets it set either, so a
 * remount (Fast Refresh keeps the ref) sets them again as the camera needs.
 */
export function useLabelsCleanup(state: RefObject<ProjectorState>): void {
  useEffect(
    () => () => {
      document.documentElement.removeAttribute(HUD_AWAY)
      const layer = document.getElementById(LABELS_ID)
      layer?.removeAttribute('role')
      layer?.removeAttribute('aria-label')
      state.current.away = false
      state.current.landmark = false
      state.current.layer = null
    },
    [state],
  )
}

/**
 * The map readout in the frame: the plate's line, and a line for the view
 * that the frame loop fills in (returned). It steps aside while a place is open.
 */
export function useReadout(placeCount: number, districtCount: number, placeOpen: boolean): RefObject<{ view: HTMLElement; wait: number } | null> {
  const readout = useRef<{ view: HTMLElement; wait: number } | null>(null)
  useEffect(() => {
    const el = document.getElementById(READOUT_ID)
    if (!el) return
    const plate = document.createElement('div')
    plate.textContent = `Plate 01 · ${districtCount} districts · ${placeCount} places`
    const view = document.createElement('div')
    el.replaceChildren(plate, view)
    readout.current = { view, wait: 0 }
    return () => {
      el.replaceChildren()
      el.style.visibility = ''
      readout.current = null
    }
  }, [placeCount, districtCount])
  useEffect(() => {
    const el = document.getElementById(READOUT_ID)
    if (el) el.style.visibility = placeOpen ? 'hidden' : ''
  }, [placeOpen])
  return readout
}
