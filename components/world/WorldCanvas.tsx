'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Canvas, useFrame } from '@react-three/fiber'
import type { District, Place } from '@/content/types'
import { Hint } from '@/components/hud/Hint'
import { Labels } from '@/components/hud/Labels'
import { useTheme } from '@/components/hud/ThemeProvider'
import { CAMERA_FOV } from '@/lib/world/camera'
import { DOWNGRADE_SAMPLES, hookedRenderScale, postProcessing, shouldDowngrade, testHooksOn, type Quality } from '@/lib/world/quality'
import { districtFromSearch, placeHref, placeIdFromPath } from '@/lib/world/route'
import { placeView } from '@/lib/world/starfield'
import { Ambient } from './Ambient'
import { CameraRig, type RigReport } from './CameraRig'
import { Clouds } from './Clouds'
import { Effects } from './Effects'
import { LabelProjector } from './LabelProjector'
import { Lights } from './Lights'
import { LookDriver } from './LookDriver'
import { DrawOnResize } from './DrawOnResize'
import { disposeMaterials } from './materials'
import { NightSky } from './NightSky'
import { PauseWhenHidden } from './PauseWhenHidden'
import { Places } from './Places'
import { Planet } from './Planet'
import { Scatter } from './Scatter'
import { SkyDome } from './SkyDome'

export interface WorldProps {
  districts: District[]
  places: Place[]
  quality: Quality
  reducedMotion: boolean
}

interface WorldCanvasProps extends WorldProps {
  /** The first frame has been drawn. */
  onReady(): void
  /** The graphics context was lost; the picture should take over. */
  onFail(): void
}

/** The most pixels drawn per CSS pixel at each quality. */
const MAX_DPR: Record<Quality, number> = { high: 2, low: 1.25 }
/** The test hooks (`window.__worldFrames`, `window.__worldRenderScale`) are live only in an e2e build; see `testHooksOn`. */
const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E)
/** A frame longer than this is a stall, not a slow device. (A hidden tab draws nothing, and starts its clock afresh.) */
const PAUSE_SECONDS = 0.5
/** How long the hint takes to fade once the planet is touched, in milliseconds. */
const HINT_FADE_MS = 300

/** The hint under the planet: shown until the visitor first touches it, then fading, then gone for the visit. */
type HintState = 'shown' | 'fading' | 'gone'

/** Calls `onFrame` once, on the first frame. */
function FirstFrame({ onFrame }: { onFrame(): void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onFrame()
  })
  return null
}

/** A test hook: counts every frame the world draws on `window.__worldFrames`. Only in an e2e build. */
function FrameCounter() {
  useLayoutEffect(() => {
    window.__worldFrames = 0
  }, [])
  useFrame(() => {
    window.__worldFrames = (window.__worldFrames ?? 0) + 1
  })
  return null
}

/** Keeps the last two seconds of frame times and calls `onSlow` once they run long. */
function FrameWatch({ onSlow }: { onSlow(): void }) {
  const samples = useRef<number[]>([])
  useFrame((_, delta) => {
    if (delta > PAUSE_SECONDS) return
    const ms = samples.current
    ms.push(delta * 1000)
    if (ms.length > DOWNGRADE_SAMPLES) ms.shift()
    if (shouldDowngrade(ms)) {
      ms.length = 0
      onSlow()
    }
  })
  return null
}

/**
 * The 3D world behind the page. React context does not cross into the
 * canvas, so the theme, the route and the router are read here and handed in
 * as props. It stays hidden until its first frame is drawn, and drops to low
 * quality for good if frames run long. Its wrapper reports what the camera
 * rig is doing as `data-rig-mode`, `data-rig-target` and `data-rig-autorotate`, and
 * the quality it is drawing at as `data-quality` (which the poster capture checks).
 *
 * Once drawn, it also puts the map labels and the hint over the page. They are
 * HTML, outside the canvas (whose wrapper is hidden from assistive technology),
 * at the end of the body so they come after the page's own content in the tab
 * order. The canvas pins the labels to the planet (`LabelProjector`).
 */
export function WorldCanvas({ districts, places, quality: initialQuality, reducedMotion, onReady, onFail }: WorldCanvasProps) {
  const { look } = useTheme()
  const router = useRouter()
  const placeId = placeIdFromPath(usePathname())
  const search = useSearchParams()
  const district = placeId === null ? districtFromSearch(search.toString()) : null
  // At a place, what its visitor sees the landmark across: the low clouds, the routes and their travellers keep out of it.
  const focusedView = useMemo(() => {
    const place = placeId === null ? undefined : places.find((p) => p.id === placeId)
    return place ? placeView(place, districts, places) : null
  }, [placeId, places, districts])
  const [quality, setQuality] = useState(initialQuality)
  const effects = postProcessing(initialQuality, quality)
  // A test hook, read once, and only in an e2e build: the e2e tests set `window.__worldRenderScale` to draw fewer pixels in
  // software rendering. Below 1 it scales the capped pixel ratio itself (a range cannot go under a screen's own ratio of 1).
  const [scale] = useState(() => hookedRenderScale(process.env.NEXT_PUBLIC_E2E, typeof window === 'undefined' ? undefined : window.__worldRenderScale))
  const [drawn, setDrawn] = useState(false)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [hint, setHint] = useState<HintState>('shown')
  const wrapper = useRef<HTMLDivElement>(null)
  // What the rig last reported, for the labels, which fade while it flies.
  const rigNow = useRef<RigReport | null>(null)

  const leave = useCallback(() => router.push('/'), [router])
  const visit = useCallback(
    (id: string) => {
      if (id !== placeId) router.push(placeHref(id))
    },
    [router, placeId],
  )
  // Written straight to the element: the rig reports only on a change, and the page need not re-render.
  const report = useCallback((next: RigReport) => {
    rigNow.current = next
    const el = wrapper.current
    if (!el) return
    el.dataset.rigMode = next.mode
    el.dataset.rigTarget = next.target ?? ''
    el.dataset.rigAutorotate = String(next.autoRotate)
  }, [])

  useEffect(() => {
    if (!canvas) return
    const lost = () => onFail()
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [canvas, onFail])

  // The first touch of the planet, a drag or a scroll, sends the hint away.
  useEffect(() => {
    if (!canvas) return
    const touched = () => setHint((now) => (now === 'shown' ? 'fading' : now))
    canvas.addEventListener('pointerdown', touched)
    canvas.addEventListener('wheel', touched, { passive: true })
    return () => {
      canvas.removeEventListener('pointerdown', touched)
      canvas.removeEventListener('wheel', touched)
    }
  }, [canvas])
  useEffect(() => {
    if (hint !== 'fading') return
    const id = window.setTimeout(() => setHint('gone'), HINT_FADE_MS)
    return () => window.clearTimeout(id)
  }, [hint])

  // The shared materials outlive any one mesh; they go when the world does.
  useEffect(() => disposeMaterials, [])

  return (
    <>
      <div ref={wrapper} aria-hidden data-quality={quality} className="fixed inset-0 z-[1]" style={{ visibility: drawn ? 'visible' : 'hidden' }}>
        <Canvas
          dpr={scale === 1 ? [1, MAX_DPR[quality]] : Math.min(window.devicePixelRatio, MAX_DPR[quality]) * scale}
          flat
          // The sky covers every pixel, so the canvas is opaque. At high quality multisampling is the bloom target's job; the
          // canvas cannot gain it later, so one that drops to low keeps drawing through that target without the bloom (`Effects`).
          gl={{ alpha: false, antialias: initialQuality === 'low' }}
          camera={{ fov: CAMERA_FOV, near: 0.05, far: 300 }}
          onCreated={({ gl }) => setCanvas(gl.domElement)}
        >
          <FirstFrame
            onFrame={() => {
              setDrawn(true)
              onReady()
            }}
          />
          <DrawOnResize />
          <PauseWhenHidden />
          {TEST_HOOKS ? <FrameCounter /> : null}
          {quality === 'high' ? <FrameWatch onSlow={() => setQuality('low')} /> : null}
          <LookDriver look={look} placeOpen={placeId !== null} reducedMotion={reducedMotion} />
          <CameraRig
            placeId={placeId}
            district={district}
            places={places}
            districts={districts}
            reducedMotion={reducedMotion}
            onLeave={leave}
            onReport={report}
          />
          <LabelProjector places={places} districts={districts} placeId={placeId} rig={rigNow} quality={quality} />
          <Lights />
          <SkyDome night={look === 'night'} reducedMotion={reducedMotion} />
          <NightSky quality={quality} />
          <Clouds quality={quality} still={reducedMotion} view={focusedView} />
          <Planet districts={districts} quality={quality} />
          <Scatter districts={districts} places={places} quality={quality} />
          <Ambient districts={districts} places={places} quality={quality} still={reducedMotion} view={focusedView} />
          <Places places={places} districts={districts} onVisit={visit} />
          {effects === 'none' ? null : <Effects bloom={effects === 'bloom'} />}
        </Canvas>
      </div>
      {drawn
        ? createPortal(
            <>
              <Labels districts={districts} places={places} />
              {placeId === null && hint !== 'gone' ? <Hint fading={hint === 'fading'} /> : null}
            </>,
            document.body,
          )
        : null}
    </>
  )
}
