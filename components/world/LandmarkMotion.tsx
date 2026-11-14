'use client'

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { arrival } from '@/components/hud/arrivalStore'
import { districtOrder } from '@/content/world'
import type { Place } from '@/content/types'
import { landmarkDelays, riseAt } from '@/lib/arrival'
import { labelId } from '@/lib/world/labels'
import { PULSE_KINDS, PULSES, acrossFor, landedOn, pulseStretch, type PulseKind, type RigSeen } from '@/lib/world/landmarkMotion'
import type { RigReport } from './CameraRig'

/** No pulse running. */
const NONE = -1

export interface LandmarkMotion {
  /** The ref for place `index`'s moving group: what stands on the ground (its batch and its shadow), never its hit sphere. */
  bind(index: number): (group: Group | null) => void
  /** Place `index` was hovered: it lifts and settles, if the camera is out over the planet (from afar) and it is not already moving. */
  hovered(index: number): void
}

/**
 * Every landmark's motion, in one loop for them all: each rises from the
 * ground in its turn while the arrival plays (`riseAt`, on the arrival's
 * clock), lifts and settles when hovered or its label is focused from afar,
 * and settles with a little squash as the camera lands on it (`PULSES`). It
 * scales the place's whole group (its batch), so it adds no draw call, and
 * at rest it writes nothing. Nothing here is made anew each frame. No pulse
 * under reduced motion (and the arrival never plays then).
 */
export function useLandmarkMotion({ places, rig, reducedMotion }: { places: Place[]; rig?: RefObject<RigReport | null>; reducedMotion: boolean }): LandmarkMotion {
  const groups = useRef<Array<Group | null>>([])
  const state = useMemo(() => {
    const delays = landmarkDelays(places, districtOrder)
    return {
      // When each starts to rise; one not in a district of the tour rises with the last.
      delays: Float64Array.from(places, (p) => delays.get(p.id) ?? Math.max(0, ...delays.values())),
      // When each one's pulse began (`performance.now()` ms), or NONE, and which pulse it is.
      pulseAt: new Float64Array(places.length).fill(NONE),
      pulseKind: new Uint8Array(places.length),
      // Whether each is at rest, so nothing is written to it until it moves again.
      resting: new Uint8Array(places.length),
      index: new Map(places.map((p, i) => [p.id, i])),
      rig: { mode: null, target: null } as RigSeen,
    }
  }, [places])
  const still = useRef(reducedMotion)
  still.current = reducedMotion

  const pulse = useCallback(
    (index: number, kind: PulseKind) => {
      if (still.current || index < 0) return
      const now = performance.now()
      const started = state.pulseAt[index]!
      if (started !== NONE && now - started < PULSES[PULSE_KINDS[state.pulseKind[index]!]!].ms) return
      state.pulseAt[index] = now
      state.pulseKind[index] = PULSE_KINDS.indexOf(kind)
    },
    [state],
  )
  // From afar: only while the camera is out over the planet, not at a place.
  const fromAfar = useCallback(() => (rig?.current?.mode ?? 'orbit') === 'orbit', [rig])
  const hovered = useCallback((index: number) => fromAfar() && pulse(index, 'hover'), [fromAfar, pulse])

  // A place's label focused from afar answers as its landmark hovered does.
  useEffect(() => {
    const ids = new Map(places.map((p, i) => [labelId(p.id), i]))
    const focused = (e: FocusEvent) => {
      const index = e.target instanceof Element ? ids.get(e.target.id) : undefined
      if (index !== undefined) hovered(index)
    }
    document.addEventListener('focusin', focused)
    return () => document.removeEventListener('focusin', focused)
  }, [places, hovered])

  useFrame(() => {
    const now = performance.now()
    const since = arrival.elapsed(now)
    // The camera has just landed on a place: it settles.
    const report = rig?.current
    if (report && (report.mode !== state.rig.mode || report.target !== state.rig.target)) {
      const landed = landedOn(state.rig, report)
      state.rig.mode = report.mode
      state.rig.target = report.target
      if (landed !== null) pulse(state.index.get(landed) ?? NONE, 'land')
    }
    const list = groups.current
    for (let i = 0; i < list.length; i++) {
      const group = list[i]
      if (!group) continue
      const rise = since === Number.POSITIVE_INFINITY ? 1 : riseAt(since, state.delays[i]!)
      let stretch = 0
      const started = state.pulseAt[i]!
      if (started !== NONE) {
        stretch = pulseStretch(PULSE_KINDS[state.pulseKind[i]!]!, now - started)
        if (now - started >= PULSES[PULSE_KINDS[state.pulseKind[i]!]!].ms) state.pulseAt[i] = NONE
      }
      if (rise === 1 && stretch === 0) {
        if (state.resting[i]) continue
        state.resting[i] = 1
        group.visible = true
        group.scale.set(1, 1, 1)
        continue
      }
      state.resting[i] = 0
      // Not drawn until it starts to rise (never scaled to nothing, which no matrix can undo).
      group.visible = rise > 0
      if (rise > 0) {
        const across = rise * acrossFor(stretch)
        group.scale.set(across, rise * (1 + stretch), across)
      }
    }
  })

  const bind = useCallback(
    (index: number) => (group: Group | null) => {
      groups.current[index] = group
      if (group) state.resting[index] = 0
    },
    [state],
  )
  return { bind, hovered }
}
