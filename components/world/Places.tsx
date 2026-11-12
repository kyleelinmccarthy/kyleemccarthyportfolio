'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry } from 'three'
import type { District, LatLon, Place } from '@/content/types'
import { MODEL_SCALE } from '@/lib/world/camera'
import { dirOf, surfaceFrame } from '@/lib/world/geo'
import { footprintRadius, shadowRadius } from '@/lib/world/kit'
import { HOVER_GRACE_MS, labelId } from '@/lib/world/labels'
import { isClick } from '@/lib/world/rig'
import { groundOf } from '@/lib/world/terrain'
import { hoverGrace } from './hoverGrace'
import { Batched, ContactShadow } from './models/kit'
import { modelFor } from './models/registry'

/**
 * Stands its children on the ground at `at`, in model units: local +Y along
 * the surface normal, local +Z pointing south (the camera arrives from the
 * south), scaled by `MODEL_SCALE`. Every landmark is placed through this.
 */
export function OnGround({ at, districts, children }: { at: LatLon; districts: District[]; children: ReactNode }) {
  const { position, quaternion } = useMemo(() => {
    const { up, south, east } = surfaceFrame(dirOf(at))
    // East, up and south are right-handed: east = up × south.
    const rotation = new Matrix4().makeBasis(east, up, south)
    return { position: groundOf(at, districts), quaternion: new Quaternion().setFromRotationMatrix(rotation) }
  }, [at, districts])
  return (
    <group position={position} quaternion={quaternion} scale={MODEL_SCALE}>
      {children}
    </group>
  )
}

/** The hit sphere round a landmark, in model units: wide enough to catch on a small one, as tall as a tall one. */
const hitRadius = (place: Place) => Math.max(0.7, place.height * 0.62)

/** Marks a place's label as hovered, or not. */
function mark(id: string, hot: boolean) {
  document.getElementById(labelId(id))?.toggleAttribute('data-hot', hot)
}

interface PlacesProps {
  places: Place[]
  districts: District[]
  /** Go to a place, as clicking its label would. */
  onVisit(id: string): void
}

/**
 * Every place's landmark on the ground, each with an invisible sphere to
 * catch the pointer. Hovering one lights its label and shows a pointer;
 * clicking it (not dragging across it) visits the place. The nearest landmark
 * under the pointer takes the event, and the planet keeps those behind it from
 * taking any (see `Planet`).
 */
export function Places({ places, districts, onVisit }: PlacesProps) {
  const canvas = useThree((state) => state.gl.domElement)
  // A hovered landmark's label stays lit a while after the pointer leaves, so the pointer can reach its tag.
  const grace = useMemo(() => hoverGrace(mark, HOVER_GRACE_MS), [])
  const hit = useMemo(
    () => ({ geometry: new SphereGeometry(1, 10, 8), material: new MeshBasicMaterial({ visible: false }) }),
    [],
  )
  useEffect(
    () => () => {
      hit.geometry.dispose()
      hit.material.dispose()
    },
    [hit],
  )
  // Nothing stays lit, no grace timer is left running, and the pointer goes back to normal, when the landmarks go.
  useEffect(
    () => () => {
      grace.clear()
      for (const place of places) mark(place.id, false)
      canvas.style.cursor = ''
    },
    [places, canvas, grace],
  )

  return (
    <group>
      {places.map((place) => {
        const district = districts.find((d) => d.id === place.district)
        if (!district) return null
        const Model = modelFor(place.model)
        // How far this landmark may reach: the footprint, or less where a neighbour stands close.
        const allowed = footprintRadius(place.id, places)
        const over = (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          grace.heat(place.id)
          canvas.style.cursor = 'pointer'
        }
        const out = () => {
          grace.coolLater(place.id)
          canvas.style.cursor = ''
        }
        const click = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (isClick(e.delta)) onVisit(place.id)
        }
        return (
          <OnGround key={place.id} at={place.at} districts={districts}>
            {Model.shadow === false ? null : <ContactShadow radius={shadowRadius(allowed, Model.shadow)} />}
            <Batched name={place.id} radius={allowed}>
              <Model place={place} district={district} />
            </Batched>
            <mesh
              geometry={hit.geometry}
              material={hit.material}
              position={[0, place.height / 2, 0]}
              scale={hitRadius(place)}
              dispose={null}
              onPointerOver={over}
              onPointerOut={out}
              onClick={click}
            />
          </OnGround>
        )
      })}
    </group>
  )
}
