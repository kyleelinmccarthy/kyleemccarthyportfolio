'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { guideLook, type GuestChoice } from '@/content/characters'
import type { LookKey } from '@/content/types'
import { guestChoiceFrom, guestLook } from '@/lib/guests'
import { characterHeight } from '@/lib/world/characters'
import { Aim, FigureCanvas, StageFigure } from './FigureStage'
import { LookDriver } from './LookDriver'

/** What a portrait shows: the guide, or a visitor's character (its age, style and skin tone; anything unknown is the default's); in the day's light or the night's; turned this far (radians) from facing the camera. */
export interface PortraitRequest {
  look: 'guide' | Record<keyof GuestChoice, string>
  sky?: LookKey
  turn?: number
  /** How much of the figure fills the frame, from the head down: 1 is the whole figure, 0.4 the head and shoulders. */
  frame?: number
}

/** Reports, on the wrapper, once some frames are drawn: the capture waits for it. */
function Ready({ onReady }: { onReady(): void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 8) onReady()
  })
  return null
}

/**
 * One character alone, for the picker's pictures and for review (a test hook:
 * `window.__characterPortrait`, honoured only in an e2e build; see
 * `WorldCanvas` and scripts/capture-characters.ts). The figure in the
 * landmarks' own light and materials, on a transparent background, standing
 * still (`FigureCanvas`). Alone, it keeps its own look (`LookDriver`). Its
 * wrapper carries `data-portrait="ready"` once drawn.
 */
export function PortraitCanvas({ request, onReady }: { request: PortraitRequest; onReady(): void }) {
  const look = request.look === 'guide' ? guideLook : guestLook(guestChoiceFrom(request.look))
  const wrapper = useRef<HTMLDivElement>(null)
  const height = characterHeight(look)
  // The picture standing in for the world goes: the portrait is drawn on nothing.
  useEffect(() => onReady(), [onReady])
  return (
    <div ref={wrapper} aria-hidden data-portrait="drawing" className="fixed inset-0 z-[1]">
      <FigureCanvas dpr={1} preserve>
        <Aim height={height} frame={request.frame ?? 1} />
        <LookDriver look={request.sky ?? 'afternoon'} placeOpen={false} reducedMotion />
        <StageFigure look={look} turn={request.turn ?? 0} />
        <Ready onReady={() => wrapper.current?.setAttribute('data-portrait', 'ready')} />
      </FigureCanvas>
    </div>
  )
}
