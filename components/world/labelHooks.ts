'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { COVERS_LABELS, LABELS_ID, type ScreenRect, type TagSize } from '@/lib/world/labels'
import { labelPressIsTheMaps } from '@/lib/world/pointers'
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

/** How long after a press on a label turned into the map's a click on that label is swallowed, in milliseconds. */
const FORWARDED_CLICK_MS = 600

/**
 * A drag or a pinch that begins on a map label moves the planet, as one that
 * begins on the canvas does; a tap still follows the label's link, and the
 * keyboard is untouched. Labels take no touch gestures of their own
 * (`touch-action: none`), so while a press on one is still a tap it is the
 * label's; once it moves further than a click may, or at once if another
 * finger is already down (`labelPressIsTheMaps`), it is handed to the canvas:
 * a pointerdown is sent there from where the press began, and the canvas's
 * handlers capture the pointer, so every move and the lift after go to them.
 * The click the lift would then make on the label is swallowed.
 */
export function useLabelGestures(canvas: HTMLCanvasElement): void {
  useEffect(() => {
    const down = new Set<number>()
    const pending = new Map<number, { x: number; y: number; init: PointerEventInit }>()
    // When each pointer's press was handed to the map: only that pointer's click is swallowed, not another label's tap.
    const handedOver = new Map<number, number>()
    const labelOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(`#${LABELS_ID} .lm`) : null)
    const handOver = (init: PointerEventInit) => {
      handedOver.set(init.pointerId ?? 0, performance.now())
      canvas.dispatchEvent(new PointerEvent('pointerdown', init))
    }
    const press = (e: PointerEvent) => {
      // The first finger of a new touch (a real one: the map's own hand-overs are not): any pointer still counted is
      // one whose lift was lost.
      if (e.isTrusted && e.isPrimary && e.pointerType !== 'mouse') forgetAll()
      down.add(e.pointerId)
      if (!labelOf(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return
      const init: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        button: e.button,
        buttons: e.buttons,
        width: e.width,
        height: e.height,
        pressure: e.pressure,
      }
      if (labelPressIsTheMaps(0, down.size - 1)) handOver(init)
      else pending.set(e.pointerId, { x: e.clientX, y: e.clientY, init })
    }
    const move = (e: PointerEvent) => {
      const p = pending.get(e.pointerId)
      if (!p || !labelPressIsTheMaps(Math.hypot(e.clientX - p.x, e.clientY - p.y), 0)) return
      pending.delete(e.pointerId)
      handOver(p.init)
    }
    const lift = (e: PointerEvent) => {
      down.delete(e.pointerId)
      pending.delete(e.pointerId)
    }
    // Lifts that never arrive (the window losing focus, the page hidden, capture lost) must not leave a pointer
    // counted as down: the next tap on a label would count as a pinch's second finger and lose its click.
    const forgetAll = () => {
      down.clear()
      pending.clear()
    }
    const hidden = () => {
      if (document.visibilityState === 'hidden') forgetAll()
    }
    // Capture lost is a lift, unless it is the label letting go of a press it has just handed to the map.
    const lostCapture = (e: PointerEvent) => {
      if (!handedOver.has(e.pointerId)) lift(e)
    }
    // A press handed to the map is not also a click on the label. A keyboard's click (detail 0) always goes through.
    const click = (e: MouseEvent) => {
      if (e.detail === 0 || !labelOf(e.target)) return
      // The click names its pointer where the browser says (a click is a PointerEvent in Chromium and Firefox).
      const id = (e as Partial<PointerEvent>).pointerId
      const at = id !== undefined && id >= 0 ? handedOver.get(id) : Math.max(0, ...handedOver.values())
      if (at === undefined || performance.now() - at > FORWARDED_CLICK_MS) return
      if (id !== undefined) handedOver.delete(id)
      e.preventDefault()
      e.stopPropagation()
    }
    // A link is draggable: a drag from a label would take the pointer away from the map.
    const dragStart = (e: DragEvent) => {
      if (labelOf(e.target)) e.preventDefault()
    }
    document.addEventListener('pointerdown', press, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', lift, true)
    document.addEventListener('pointercancel', lift, true)
    document.addEventListener('click', click, true)
    document.addEventListener('dragstart', dragStart, true)
    document.addEventListener('lostpointercapture', lostCapture, true)
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('blur', forgetAll)
    return () => {
      document.removeEventListener('pointerdown', press, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', lift, true)
      document.removeEventListener('pointercancel', lift, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('dragstart', dragStart, true)
      document.removeEventListener('lostpointercapture', lostCapture, true)
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('blur', forgetAll)
    }
  }, [canvas])
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
