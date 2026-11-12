'use client'

import { Component, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { District, Place } from '@/content/types'
import { pickQuality, type Quality } from '@/lib/world/quality'
import { Poster } from './Poster'

// The 3D code is its own chunk, fetched only once the page is idle.
const WorldCanvas = dynamic(() => import('./WorldCanvas').then((m) => m.WorldCanvas), { ssr: false })

/** waiting: for the page to settle. loading: the 3D code is on its way. running: the canvas is drawing. */
type Status = 'waiting' | 'loading' | 'running' | 'failed'

/** The longest the page waits for an idle moment before fetching the 3D code anyway. */
const IDLE_TIMEOUT_MS = 2000

/** Whether this browser can give us a WebGL 2 context. The test context is released straight away. */
function canUseWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}

/** Quality from what the browser says about the device and the connection. */
function qualityHere(): Quality {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  return pickQuality({
    saveData: nav.connection?.saveData ?? false,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency || undefined,
    width: window.innerWidth,
  })
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}

/** Anything thrown while loading or drawing the world hands over to the picture. */
class WorldBoundary extends Component<{ onError(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The world behind the page. The server sends the picture; once the page is
 * idle, and only if WebGL 2 is there, the 3D code is fetched and the canvas
 * replaces the picture after its first frame. If the canvas throws or loses
 * its graphics context, the picture comes back and stays.
 */
export function WorldLoader({ districts, places }: { districts: District[]; places: Place[]; tourOrder: string[] }) {
  const [status, setStatus] = useState<Status>('waiting')
  const [quality, setQuality] = useState<Quality>('high')
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!canUseWebGL2()) {
      setStatus('failed')
      return
    }
    const start = () => {
      setQuality(qualityHere())
      setStatus('loading')
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(start, 1)
    return () => window.clearTimeout(id)
  }, [])

  const fail = useCallback(() => setStatus('failed'), [])
  const ready = useCallback(() => setStatus((now) => (now === 'loading' ? 'running' : now)), [])

  return (
    <>
      {status === 'running' ? null : <Poster />}
      {status === 'loading' || status === 'running' ? (
        <WorldBoundary onError={fail}>
          {/* The canvas reads the query string; the boundary keeps that from taking the pages out of static rendering. */}
          <Suspense fallback={null}>
            <WorldCanvas
              districts={districts}
              places={places}
              quality={quality}
              reducedMotion={reducedMotion}
              onReady={ready}
              onFail={fail}
            />
          </Suspense>
        </WorldBoundary>
      ) : null}
    </>
  )
}
