'use client'

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { guideLook, type GuestChoice } from '@/content/characters'
import type { District, Place } from '@/content/types'
import { guestLook } from '@/lib/guests'
import { BUBBLE_ID, landmarkMiddle, placeBubble, type BubblePlacement } from '@/lib/world/bubble'
import { bubbleAnchor, onTheGround, standingFor, worldAt } from '@/lib/world/characters'
import { hudGivesWay, isOccluded, landmarkBox, landmarkTop, type ScreenRect, type TagSize } from '@/lib/world/labels'
import { groundOf } from '@/lib/world/terrain'
import type { RigReport } from './CameraRig'
import { useLabelMeasures } from './labelHooks'
import { projectToScreen } from './screenProject'

/** The bubble's size until it has been measured. */
const SIZE_GUESS: TagSize = { width: 310, height: 110 }

/** What was last written to the bubble, so only what changes is written again. */
interface Written {
  shown: boolean | null
  docked: boolean | null
  transform: string
  side: string
  tail: string
}

const fresh = (w: Written) => Object.assign(w, { shown: null, docked: null, transform: '', side: '', tail: '' })

/** Writes the bubble's placement: only what changed. While the camera flies it is hidden (`data-away`); docked, the page places it. */
export function writeBubble(el: HTMLElement, shown: boolean, p: BubblePlacement, last: Written): void {
  if (shown !== last.shown) {
    el.toggleAttribute('data-away', !shown)
    last.shown = shown
  }
  if (p.docked !== last.docked) {
    el.toggleAttribute('data-docked', p.docked)
    last.docked = p.docked
    if (p.docked) {
      el.style.transform = ''
      last.transform = ''
    }
  }
  if (p.docked) return
  const transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`
  if (transform !== last.transform) {
    el.style.transform = transform
    last.transform = transform
  }
  if (p.side !== last.side) {
    el.dataset.side = p.side
    last.side = p.side
  }
  const tail = `${p.tail.toFixed(1)}px`
  if (tail !== last.tail) {
    el.style.setProperty('--tail', tail)
    last.tail = tail
  }
}

interface BubbleProjectorProps {
  places: Place[]
  districts: District[]
  /** The place open, or null: over the planet the bubble is docked in the HUD, and nothing is projected. */
  placeId: string | null
  /** The visitor's character: the bubble keeps off it too. */
  guest: GuestChoice
  rig: RefObject<RigReport | null>
}

const DOCKED: BubblePlacement = { docked: true }

/** A screen point to project into, reused frame to frame. */
const point = () => ({ x: 0, y: 0, behind: false, inView: false })

/**
 * Pins the guide's speech bubble (`GuideBubble`, HTML over the canvas) over
 * her head at a place, as the labels are pinned (`LabelProjector`, sharing its
 * `projectToScreen`): each frame it projects the point over her head and
 * writes the bubble's transform, side and tail, and nothing else. It never
 * sets React state, never reads the page's layout (what covers the map comes
 * from `useLabelMeasures`, the bubble's size from a ResizeObserver) and builds
 * nothing per frame: its points, rectangles and lists are kept and refilled.
 * Where it goes is `placeBubble`'s to decide: clear of the panel, the tour bar
 * and the header, the middle of the landmark and the visitor's character,
 * inside the frame, and docked in the HUD when it cannot stand by her. A
 * bubble the page has docked itself (`data-pin="off"`: folded, or quiet) and
 * the bubble over the planet are left alone. It hides while the camera flies.
 */
export function BubbleProjector({ places, districts, placeId, guest: { age, style, skin }, rig }: BubbleProjectorProps) {
  const measured = useLabelMeasures()
  const size = useRef<TagSize>({ ...SIZE_GUESS })
  const written = useRef<Written>(fresh({} as Written))
  const el = useRef<HTMLElement | null>(null)
  const away = useRef(false)
  // Kept and refilled every frame.
  const scratch = useMemo(
    () => ({ head: point(), foot: point(), top: point(), guestFeet: point(), guestHead: point(), view: { width: 0, height: 0 }, guest: { left: 0, top: 0, right: 0, bottom: 0 }, keepOut: [] as ScreenRect[] }),
    [],
  )
  const place = placeId === null ? undefined : places.find((p) => p.id === placeId)
  const anchors = useMemo(() => {
    if (!place) return null
    const stand = standingFor(place.id)
    const guide = onTheGround(place, districts, stand.guide)
    const guest = onTheGround(place, districts, stand.guest)
    return {
      head: bubbleAnchor(place, districts, guide, guideLook),
      ground: groundOf(place.at, districts),
      top: landmarkTop(place, districts),
      // The visitor's character, from its feet to over its head (its own look's height).
      guestFeet: worldAt(place, districts, guest.at),
      guestHead: bubbleAnchor(place, districts, guest, guestLook({ age, style, skin })),
    }
  }, [place, districts, age, style, skin])

  // The bubble's size, measured when it changes (a new line, the screen's width, folding), never in the frame loop.
  useEffect(() => {
    let observer: ResizeObserver | null = null
    let frame = 0
    const watch = () => {
      const bubble = document.getElementById(BUBBLE_ID)
      if (!bubble) {
        frame = window.requestAnimationFrame(watch)
        return
      }
      observer = new ResizeObserver(() => {
        if (bubble.offsetWidth > 0) size.current = { width: bubble.offsetWidth, height: bubble.offsetHeight }
      })
      observer.observe(bubble)
    }
    watch()
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [])
  // A new place: everything is written afresh.
  useEffect(() => {
    fresh(written.current)
  }, [placeId])

  useFrame(({ camera, size: viewSize }) => {
    if (!el.current?.isConnected) {
      el.current = document.getElementById(BUBBLE_ID)
      fresh(written.current)
    }
    const bubble = el.current
    if (!bubble) return
    // Over the planet, or docked by the page itself: nothing to pin. Whatever pinning left on it goes, once.
    if (!anchors || bubble.dataset.pin === 'off') {
      if (written.current.docked !== true || written.current.shown !== true) writeBubble(bubble, true, DOCKED, written.current)
      return
    }
    camera.updateMatrixWorld()
    const shown = (rig.current?.mode ?? 'orbit') !== 'fly'
    away.current = hudGivesWay(camera.position.length(), away.current)
    const s = scratch
    s.view.width = viewSize.width
    s.view.height = viewSize.height
    // What covers the map now (as `coversInForce` decides, without building a list each frame).
    s.keepOut.length = 0
    const active = document.activeElement
    for (const c of measured.current.covers) {
      if (away.current && c.givesWay && !(active !== null && c.el.contains(active))) continue
      s.keepOut.push(c.rect)
    }
    const head = projectToScreen(anchors.head, camera, s.view, s.head)
    projectToScreen(anchors.ground, camera, s.view, s.foot)
    projectToScreen(anchors.top, camera, s.view, s.top)
    projectToScreen(anchors.guestFeet, camera, s.view, s.guestFeet)
    projectToScreen(anchors.guestHead, camera, s.view, s.guestHead)
    const reach = Math.max(6, Math.abs(s.guestFeet.y - s.guestHead.y) * 0.3)
    s.guest.left = Math.min(s.guestFeet.x, s.guestHead.x) - reach
    s.guest.right = Math.max(s.guestFeet.x, s.guestHead.x) + reach
    s.guest.top = Math.min(s.guestFeet.y, s.guestHead.y)
    s.guest.bottom = Math.max(s.guestFeet.y, s.guestHead.y)
    s.keepOut.push(s.guest)
    const visible = head.inView && !isOccluded(camera.position, anchors.head)
    const middle = landmarkMiddle(landmarkBox(s.foot, s.top))
    writeBubble(bubble, shown, placeBubble(head, visible, size.current, s.view, s.keepOut, middle), written.current)
  })

  return null
}
