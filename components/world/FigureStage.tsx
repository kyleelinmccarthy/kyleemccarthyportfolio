'use client'

import { useLayoutEffect, type ReactNode } from 'react'
import { Canvas, useThree, type CanvasProps } from '@react-three/fiber'
import type { Look } from '@/content/characters'
import { Lights } from './Lights'
import { Character } from './models/Character'
import { Batched } from './models/kit'

/*
 * What every small canvas of characters shares, apart from the world: a
 * portrait of one (`PortraitCanvas`, for the picker's pictures) and the
 * welcome pair (`PairCanvas`). The figures in the landmarks' own light and
 * materials, on a transparent background, through a long lens.
 */

/** The camera's field of view: long, so a figure is drawn nearly flat, as a photograph of a figurine is. */
export const FIGURE_FOV = 18

/** How much more than the figure the frame shows, top to bottom: a little room above the head and below the feet. */
const ROOM = 1.12

/**
 * Where the camera stands to frame the part of a figure `height` tall that
 * `frame` says (1 the whole figure, 0.4 the head and shoulders): how much
 * height the frame shows, the height it looks at, and how far back it stands.
 */
export function figureFraming(height: number, frame: number) {
  const share = Math.min(1, Math.max(0.2, frame))
  const shown = height * share * ROOM
  const middle = height * (1 - share / 2)
  const distance = shown / 2 / Math.tan(((FIGURE_FOV / 2) * Math.PI) / 180)
  return { shown, middle, distance }
}

/** Aims the camera at the part of a figure `height` tall that `frame` frames (`figureFraming`). */
export function Aim({ height, frame }: { height: number; frame: number }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const { middle, distance } = figureFraming(height, frame)
    camera.position.set(0, middle + distance * 0.12, distance)
    camera.lookAt(0, middle, 0)
    camera.updateMatrixWorld()
  }, [camera, height, frame])
  return null
}

/** One figure on the stage: at `x`, turned `turn` radians from facing the camera, batched on its own; waving, its wave `wavePhase` along. */
export function StageFigure({ look, x = 0, turn = 0, waving = false, wavePhase = 0 }: { look: Look; x?: number; turn?: number; waving?: boolean; wavePhase?: number }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, turn, 0]}>
      <Batched>
        <Character look={look} waving={waving} wavePhase={wavePhase} />
      </Batched>
    </group>
  )
}

/**
 * A transparent canvas lit as the world is (`Lights`), its camera the long
 * lens: what goes in it is the figures and how it is aimed. Everything else a
 * canvas takes (its pixel ratio, its frame loop, what happens once it is
 * made) is the caller's. It is sized by its box as laid out, not as drawn
 * (`offsetSize`), so one that pops in from a small scale is still drawn at its
 * full size.
 */
export function FigureCanvas({ children, preserve = false, ...rest }: Omit<CanvasProps, 'flat' | 'gl' | 'camera' | 'resize'> & { children: ReactNode; preserve?: boolean }) {
  return (
    <Canvas flat gl={{ alpha: true, antialias: true, preserveDrawingBuffer: preserve }} camera={{ fov: FIGURE_FOV, near: 0.01, far: 20 }} resize={{ offsetSize: true }} {...rest}>
      {/* After the children: one that keeps its own look (`LookDriver`) sets it before the lights read it, each frame. */}
      {children}
      <Lights />
    </Canvas>
  )
}
