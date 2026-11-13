'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { guideLook, type GuestChoice } from '@/content/characters'
import type { LookKey } from '@/content/types'
import { guestChoiceFrom, guestLook } from '@/lib/guests'
import { characterHeight } from '@/lib/world/characters'
import { Lights } from './Lights'
import { LookDriver } from './LookDriver'
import { Character } from './models/Character'
import { Batched } from './models/kit'

/** What a portrait shows: the guide, or a visitor's character (its age, style and skin tone; anything unknown is the default's); in the day's light or the night's; turned this far (radians) from facing the camera. */
export interface PortraitRequest {
  look: 'guide' | Record<keyof GuestChoice, string>
  sky?: LookKey
  turn?: number
  /** How much of the figure fills the frame, from the head down: 1 is the whole figure, 0.4 the head and shoulders. */
  frame?: number
}

/** The camera's field of view for a portrait: long, so the figure is drawn nearly flat, as a photograph of a figurine is. */
const FOV = 18

/** Aims the camera at the part of the figure the portrait frames. */
function Aim({ height, frame }: { height: number; frame: number }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const shown = height * Math.min(1, Math.max(0.2, frame)) * 1.12
    const middle = height * (1 - Math.min(1, Math.max(0.2, frame)) / 2)
    const distance = shown / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)
    camera.position.set(0, middle + distance * 0.12, distance)
    camera.lookAt(0, middle, 0)
    camera.updateMatrixWorld()
  }, [camera, height, frame])
  return null
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
 * still. Its wrapper carries `data-portrait="ready"` once drawn.
 */
export function PortraitCanvas({ request, onReady }: { request: PortraitRequest; onReady(): void }) {
  const look = request.look === 'guide' ? guideLook : guestLook(guestChoiceFrom(request.look))
  const wrapper = useRef<HTMLDivElement>(null)
  const height = characterHeight(look)
  // The picture standing in for the world goes: the portrait is drawn on nothing.
  useEffect(() => onReady(), [onReady])
  return (
    <div ref={wrapper} aria-hidden data-portrait="drawing" className="fixed inset-0 z-[1]">
      <Canvas flat dpr={1} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ fov: FOV, near: 0.01, far: 20 }}>
        <Aim height={height} frame={request.frame ?? 1} />
        <LookDriver look={request.sky ?? 'afternoon'} placeOpen={false} reducedMotion />
        <Lights />
        <group rotation={[0, request.turn ?? 0, 0]}>
          <Batched>
            <Character look={look} />
          </Batched>
        </group>
        <Ready onReady={() => wrapper.current?.setAttribute('data-portrait', 'ready')} />
      </Canvas>
    </div>
  )
}
