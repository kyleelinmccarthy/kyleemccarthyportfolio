'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { looks } from '@/content/sky'
import type { LookKey } from '@/content/types'
import { easeAmount, easeLook, keyLight, lookColorKeys, lookNumberKeys, sunPlacement, toLookState } from '@/lib/world/look'
import { lookUniforms } from './lookUniforms'

/** A long frame (a hidden tab, a hitch) eases no further than this many seconds would. */
const MAX_STEP = 0.05

/**
 * Eases every shared uniform toward the look for the hour, so a change of
 * theme washes across the world rather than cutting. The first frame, and
 * every frame under reduced motion, arrives at once.
 */
export function LookDriver({ look, placeOpen, reducedMotion }: { look: LookKey; placeOpen: boolean; reducedMotion: boolean }) {
  const goal = useMemo(() => toLookState(looks[look]), [look])
  const current = useRef(toLookState(looks[look]))
  const first = useRef(true)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useFrame((_, delta) => {
    const step = Math.min(delta, MAX_STEP)
    const k = first.current || reducedMotion ? 1 : easeAmount(step)
    first.current = false

    const now = current.current
    easeLook(now, goal, k)
    for (const key of lookColorKeys) lookUniforms.colors[key].value.copy(now.colors[key])
    for (const key of lookNumberKeys) lookUniforms.numbers[key].value = now.numbers[key]
    keyLight(now.colors.lit, now.colors.shade, lookUniforms.key.value)

    const sun = lookUniforms.sun.value
    const place = sunPlacement({ width, height, placeOpen, sunY: now.numbers.sunY })
    sun.set(sun.x + (place.x - sun.x) * k, place.y)
    lookUniforms.sunSize.value = place.size

    if (!reducedMotion) lookUniforms.time.value += step
  })

  return null
}
