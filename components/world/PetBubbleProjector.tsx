'use client'

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { pets } from '@/components/hud/petStore'
import { PET_IDS, PETS_LIVE_AT, type PetId } from '@/content/pets'
import type { District, Place } from '@/content/types'
import { placeBubble, type BubblePlacement } from '@/lib/world/bubble'
import { worldAt } from '@/lib/world/characters'
import { hudGivesWay, isOccluded, type ScreenRect, type TagSize } from '@/lib/world/labels'
import { PET_BUBBLE_ID, petAnchor } from '@/lib/world/pets'
import { fresh, writeBubble, type Written } from './BubbleProjector'
import type { RigReport } from './CameraRig'
import { useLabelMeasures } from './labelHooks'
import { projectToScreen } from './screenProject'

/** The word bubble's size until it has been measured. */
const SIZE_GUESS: TagSize = { width: 90, height: 40 }

const HIDDEN: BubblePlacement = { docked: true }

interface PetBubbleProjectorProps {
  places: Place[]
  districts: District[]
  placeId: string | null
  rig: RefObject<RigReport | null>
}

/**
 * Pins a pressed pet's word bubble (`PetLayer`, HTML over the canvas) just
 * over its head, as the guide's bubble is pinned over hers
 * (`BubbleProjector`, whose writer and placing rules it shares): each frame,
 * while a pet is saying something, it projects the point over that pet's head
 * and writes the bubble's transform, side and tail. Where the bubble cannot
 * stand by the pet (its head off the screen, behind the planet or under the
 * panel, or no side of it clear) it is hidden rather than docked: the word is
 * still told to a screen reader. It never sets React state, never reads the
 * page's layout in the frame loop, and builds nothing per frame.
 */
export function PetBubbleProjector({ places, districts, placeId, rig }: PetBubbleProjectorProps) {
  const measured = useLabelMeasures()
  const size = useRef<TagSize>({ ...SIZE_GUESS })
  const written = useRef<Written>(fresh({} as Written))
  const el = useRef<HTMLElement | null>(null)
  const away = useRef(false)
  const scratch = useMemo(() => ({ head: { x: 0, y: 0, behind: false, inView: false }, view: { width: 0, height: 0 }, keepOut: [] as ScreenRect[] }), [])
  const home = places.find((p) => p.model === PETS_LIVE_AT)
  const open = home !== undefined && placeId === home.id
  // Over each pet's head, in the world.
  const anchors = useMemo(
    () => (open && home ? (Object.fromEntries(PET_IDS.map((id) => [id, worldAt(home, districts, petAnchor(id))])) as Record<PetId, ReturnType<typeof worldAt>>) : null),
    [open, home, districts],
  )

  // The bubble's size, measured when it changes (a new word), never in the frame loop.
  useEffect(() => {
    if (!open) return
    let observer: ResizeObserver | null = null
    let frame = 0
    const watch = () => {
      const bubble = document.getElementById(PET_BUBBLE_ID)
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
  }, [open])

  useFrame(({ camera, size: viewSize }) => {
    if (!anchors) return
    if (!el.current?.isConnected) {
      el.current = document.getElementById(PET_BUBBLE_ID)
      fresh(written.current)
    }
    const bubble = el.current
    if (!bubble) return
    const said = pets.get().said
    if (!said) {
      if (written.current.docked !== true) writeBubble(bubble, true, HIDDEN, written.current)
      return
    }
    camera.updateMatrixWorld()
    const s = scratch
    s.view.width = viewSize.width
    s.view.height = viewSize.height
    away.current = hudGivesWay(camera.position.length(), away.current)
    s.keepOut.length = 0
    const active = document.activeElement
    for (const c of measured.current.covers) {
      if (away.current && c.givesWay && !(active !== null && c.el.contains(active))) continue
      s.keepOut.push(c.rect)
    }
    const anchor = anchors[said.pet]
    const head = projectToScreen(anchor, camera, s.view, s.head)
    const visible = head.inView && !isOccluded(camera.position, anchor)
    const shown = (rig.current?.mode ?? 'orbit') !== 'fly'
    writeBubble(bubble, shown, placeBubble(head, visible, size.current, s.view, s.keepOut, null), written.current)
  })

  return null
}
