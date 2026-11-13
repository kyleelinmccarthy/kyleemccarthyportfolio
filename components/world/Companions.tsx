'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, SphereGeometry } from 'three'
import { guideLook, type GuestChoice, type Look } from '@/content/characters'
import type { District, Place } from '@/content/types'
import { guestLook } from '@/lib/guests'
import { characterHeight, onTheGround, standingFor, type Standing } from '@/lib/world/characters'
import { WAVE_SECONDS, isWaving } from '@/lib/world/guide'
import { isClick } from '@/lib/world/rig'
import { Character } from './models/Character'
import { Batched, ContactShadow, Sway } from './models/kit'
import { OnGround } from './Places'

/** Where the guide stands when no place is open (over the planet, or a district): at her home. */
export const GUIDE_HOME = 'home'

/**
 * The visitor's character's hit shape: an ellipsoid round its body, as a share
 * of its height across, up and through. No wider than the figure itself (its
 * shoulders and hair), so a press beside it, on a landmark seen behind it,
 * reaches the landmark.
 */
export const GUEST_HIT = [0.15, 0.5, 0.1] as const

/** The soft shadow under a character's feet, in model units round. */
const FEET_SHADOW = 0.09

/**
 * One character standing at its spot: the figure (`Character`), batched on
 * its own, swaying gently from its feet as a person standing does (a `Sway`,
 * so it stands still under reduced motion), in a small soft shadow.
 */
function Person({ name, look, standing, waving = false, phase, children }: { name: string; look: Look; standing: Standing; waving?: boolean; phase: number; children?: ReactNode }) {
  return (
    <group name={`companion:${name}`} position={standing.at} rotation={[0, standing.turn, 0]}>
      <ContactShadow radius={FEET_SHADOW} />
      <Sway axis="z" amount={0.025} speed={0.8} phase={phase}>
        <Batched>
          <Character look={look} waving={waving} />
        </Batched>
      </Sway>
      {children}
    </group>
  )
}

interface CompanionsProps {
  places: Place[]
  districts: District[]
  /** The place open, or null over the planet or a district (when the guide stands at home). */
  placeId: string | null
  /** The visitor's character, as they made it. */
  guest: GuestChoice
  /** The visitor pressed their character (at a place): open the picker. */
  onPickGuest(): void
}

/**
 * The guide and the visitor's character, standing beside the landmark of the
 * place the visitor is at (`content/characters.ts` says where), or at the
 * guide's home over the planet. They are not part of any landmark: they are
 * drawn here, on the ground where `OnGround` stands the place's landmark,
 * settled onto the curve of the planet (`onTheGround`). The guide waves for a
 * few seconds whenever the visitor arrives somewhere (`isWaving`); the
 * visitor's character faces the landmark. At a place, pressing the visitor's
 * character (not dragging across it) opens the picker; nothing else about
 * them takes the pointer, so they never come between it and a landmark.
 */
export function Companions({ places, districts, placeId, guest: choice, onPickGuest }: CompanionsProps) {
  const target = placeId ?? GUIDE_HOME
  const place = places.find((p) => p.id === target)
  const canvas = useThree((state) => state.gl.domElement)
  const { age, style, skin } = choice
  const guest = useMemo(() => guestLook({ age, style, skin }), [age, style, skin])
  const standing = useMemo(() => {
    if (!place) return null
    const s = standingFor(place.id)
    return { guide: onTheGround(place, districts, s.guide), guest: onTheGround(place, districts, s.guest) }
  }, [place, districts])

  // She waves when the visitor arrives somewhere: from now, for WAVE_SECONDS, then the clock is read once more.
  const [wave, setWave] = useState<{ since: number; now: number } | null>(null)
  useEffect(() => {
    const since = performance.now() / 1000
    setWave({ since, now: since })
    const id = window.setTimeout(() => setWave({ since, now: performance.now() / 1000 }), WAVE_SECONDS * 1000 + 50)
    return () => window.clearTimeout(id)
  }, [target])
  const waving = wave !== null && isWaving(wave.now, wave.since)

  // The visitor's character's hit shape: a capsule round the figure, invisible.
  const hit = useMemo(() => ({ geometry: new SphereGeometry(1, 10, 8), material: new MeshBasicMaterial({ visible: false }) }), [])
  useEffect(
    () => () => {
      hit.geometry.dispose()
      hit.material.dispose()
    },
    [hit],
  )
  useEffect(() => () => void (canvas.style.cursor = ''), [canvas])

  if (!place || !standing) return null
  // The hit shape is sized to the figure as it stands: a kid's is smaller than an adult's.
  const tall = characterHeight(guest)
  const pressable = placeId !== null
  return (
    <OnGround at={place.at} districts={districts}>
      <Person name="guide" look={guideLook} standing={standing.guide} waving={waving} phase={0} />
      <Person name="guest" look={guest} standing={standing.guest} phase={1.7}>
        {pressable && (
          <mesh
            name="companion:guest-hit"
            geometry={hit.geometry}
            material={hit.material}
            position={[0, tall / 2, 0]}
            scale={GUEST_HIT.map((k) => k * tall) as [number, number, number]}
            dispose={null}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              canvas.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              canvas.style.cursor = ''
            }}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              if (isClick(e.delta)) onPickGuest()
            }}
          />
        )}
      </Person>
    </OnGround>
  )
}
