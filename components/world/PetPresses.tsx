'use client'

import { useEffect, useMemo } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, SphereGeometry } from 'three'
import { pets } from '@/components/hud/petStore'
import { PET_IDS, PETS_LIVE_AT } from '@/content/pets'
import type { District, Place } from '@/content/types'
import { PET_HITS, PET_SPOTS } from '@/lib/world/pets'
import { isClick } from '@/lib/world/rig'
import { OnGround } from './Places'

interface PetPressesProps {
  places: Place[]
  districts: District[]
  /** The place open, or null over the planet or a district. */
  placeId: string | null
  /** Reduced motion: a pressed pet says its word without moving. */
  reducedMotion: boolean
}

/**
 * The shapes that let the visitor press the owner's pets, at the pets' place
 * (`PETS_LIVE_AT`) while it is open, and nowhere else: over the planet a press
 * on the House opens the place, as on any landmark. One invisible ellipsoid
 * round each pet (`PET_HITS`), laid where the House stands it (`PET_SPOTS`),
 * drawn here rather than in the landmark so it costs the landmark nothing.
 * Pressing one (not dragging across it) makes the pet say its next word and
 * make its move (`pets.press`); hovering one shows a pointer. Nothing else
 * takes the pointer. The open place's own hit sphere is caught on its far
 * side (`Places`), so these, inside it, come first.
 */
export function PetPresses({ places, districts, placeId, reducedMotion }: PetPressesProps) {
  const canvas = useThree((state) => state.gl.domElement)
  const home = places.find((p) => p.model === PETS_LIVE_AT)
  const hit = useMemo(() => ({ geometry: new SphereGeometry(1, 12, 8), material: new MeshBasicMaterial({ visible: false }) }), [])
  useEffect(
    () => () => {
      hit.geometry.dispose()
      hit.material.dispose()
    },
    [hit],
  )
  const open = home !== undefined && placeId === home.id
  // The pointer goes back to normal when the pets stop taking presses (the visitor leaves) or go.
  useEffect(() => {
    if (!open) return
    return () => void (canvas.style.cursor = '')
  }, [open, canvas])

  if (!open) return null
  return (
    <OnGround at={home.at} districts={districts}>
      {PET_IDS.map((id) => {
        const { at, turn } = PET_SPOTS[id]
        const { middle, radii } = PET_HITS[id]
        return (
          <group key={id} position={at} rotation={[0, turn, 0]}>
            <mesh
              name={`pet-hit:${id}`}
              geometry={hit.geometry}
              material={hit.material}
              position={middle}
              scale={radii}
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
                if (isClick(e.delta)) pets.press(id, { still: reducedMotion })
              }}
            />
          </group>
        )
      })}
    </OnGround>
  )
}
