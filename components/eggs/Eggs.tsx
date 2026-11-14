'use client'

import { Suspense, lazy } from 'react'
import type { EggsInWorldProps } from './EggsInWorld'

/*
 * The two easter eggs (a bug on the planet by day, a d20 by night), as the
 * world mounts them: each half loaded on its own, only once the world has
 * drawn its first frame, so neither ever delays it. Nothing of them is in the
 * page's first load, and nothing at all without the world (no script, no
 * WebGL: the fallbacks never mount them).
 */

const InWorld = lazy(() => import('./EggsInWorld'))
const OnPage = lazy(() => import('./EggsOnPage').then((m) => ({ default: m.EggsOnPage })))

/** Inside the canvas: the bug by day, the constellation's press by night. */
export function EggsWorldLayer(props: EggsInWorldProps) {
  return (
    <Suspense fallback={null}>
      <InWorld {...props} />
    </Suspense>
  )
}

/** Over the page: the words, the die, the bursts, the typed word and the live region. */
export function EggsPageLayer({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Suspense fallback={null}>
      <OnPage reducedMotion={reducedMotion} />
    </Suspense>
  )
}
