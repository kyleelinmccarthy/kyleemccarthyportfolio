'use client'

import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { guideLook, type GuestChoice } from '@/content/characters'
import { guestLook } from '@/lib/guests'
import { characterHeight } from '@/lib/world/characters'
import { hookedRenderScale } from '@/lib/world/quality'
import { GUEST_WAVE_PHASE } from '@/lib/world/welcome'
import { Aim, FigureCanvas, StageFigure, figureFraming } from './FigureStage'

/** The most pixels drawn per CSS pixel: the pair is small, and sharp enough at two. */
const MAX_DPR = 2

/** How far each turns toward the other, in radians: enough to be a pair, not so much the faces are lost. */
const TOWARD = 0.28

/**
 * The two figures, the visitor's on the left and the guide's on the right (by
 * her bubble), each in the middle of its half of the frame, standing on one
 * line and framed by the taller.
 */
function Pair({ guest, waving }: { guest: GuestChoice; waving: boolean }) {
  const { age, style, skin } = guest
  const look = useMemo(() => guestLook({ age, style, skin }), [age, style, skin])
  const height = Math.max(characterHeight(guideLook), characterHeight(look))
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height))
  // The width the frame shows at the figures, from the height it shows: a quarter of it either side of the middle is the middle of each half.
  const quarter = (figureFraming(height, 1).shown * aspect) / 4
  return (
    <>
      <Aim height={height} frame={1} />
      <StageFigure look={look} x={-quarter} turn={TOWARD} waving={waving} wavePhase={GUEST_WAVE_PHASE} />
      <StageFigure look={guideLook} x={quarter} turn={-TOWARD} waving={waving} />
    </>
  )
}

/** Whether `el` is on screen and the page is showing: only then is the pair drawn. */
function useOnScreen(el: HTMLElement | null): boolean {
  const [seen, setSeen] = useState(true)
  const [shown, setShown] = useState(true)
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver((entries) => setSeen(entries.some((e) => e.isIntersecting)))
    watch.observe(el)
    return () => watch.disconnect()
  }, [el])
  useEffect(() => {
    const follow = () => setShown(!document.hidden)
    follow()
    document.addEventListener('visibilitychange', follow)
    return () => document.removeEventListener('visibilitychange', follow)
  }, [])
  return seen && shown
}

/**
 * The guide and the visitor's character, drawn live in a small canvas of
 * their own beside her greeting (`Welcome`), waving (unless `waving` is off:
 * reduced motion), the visitor's wave a little behind hers. They read the
 * world's light as it is (its `LookDriver` keeps the shared look and clock),
 * so they are lit by day or by night as the planet is, and stand still when
 * its clock does. Its frame loop runs only while it is on screen and the page
 * is showing; its pixel ratio is capped. A canvas that cannot be made throws
 * (the caller's boundary catches it); one whose context is lost calls
 * `onFail`. Everything it made goes when it unmounts.
 */
export function PairCanvas({ guest, waving, onFail }: { guest: GuestChoice; waving: boolean; onFail(): void }) {
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null)
  const onScreen = useOnScreen(wrapper)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  // A test hook, read once, and only in an e2e build: the e2e tests draw fewer pixels in software rendering, here as in the world.
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, MAX_DPR) * hookedRenderScale(process.env.NEXT_PUBLIC_E2E, window.__worldRenderScale))
  useEffect(() => {
    if (!canvas) return
    const lost = () => onFail()
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [canvas, onFail])
  return (
    <div ref={setWrapper} className="welcome-canvas">
      <FigureCanvas dpr={dpr} frameloop={onScreen ? 'always' : 'never'} onCreated={({ gl }) => setCanvas(gl.domElement)}>
        <Pair guest={guest} waving={waving} />
      </FigureCanvas>
    </div>
  )
}
