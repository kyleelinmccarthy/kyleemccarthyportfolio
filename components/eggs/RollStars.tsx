'use client'

import { useEffect, useMemo } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, SphereGeometry } from 'three'
import { ROLL_CONSTELLATION } from '@/content/eggs'
import { constellations } from '@/content/sky'
import { constellationLabelId } from '@/lib/world/labels'
import { isClick } from '@/lib/world/rig'
import { SKY_RADIUS, constellationAnchor, constellationPoints } from '@/lib/world/starfield'
import { rollForVisitor } from './eggStore'

/** How far past the furthest of its stars and its name the press reaches, in world units on the sky. */
const MARGIN = 0.6

/** Marks the constellation's name as hovered, or not: it brightens a little (`.lm-const[data-hot]`). */
function mark(id: string, hot: boolean) {
  document.getElementById(id)?.toggleAttribute('data-hot', hot)
}

/**
 * The d20 easter egg's way in, by night: "The Natural 20" on the sky takes a
 * press. One invisible ball on the sky over its stars and its name (which
 * itself never takes the pointer, `.lm-const`), so pressing either rolls the
 * die (`rollForVisitor`); hovering it shows a pointer and brightens the name a
 * little, which is all the invitation it gets. A drag across it is a drag. It
 * is the furthest thing in the world, so anything in front of it (the planet,
 * a landmark) takes a press first. Mounted only at night, when the
 * constellation is there.
 */
export function RollStars() {
  const canvas = useThree((state) => state.gl.domElement)
  const sky = useMemo(() => {
    const c = constellations.find((x) => x.name === ROLL_CONSTELLATION)
    if (!c) return null
    const stars = constellationPoints(c, SKY_RADIUS)
    const name = constellationAnchor(c, SKY_RADIUS)
    // Round its stars and its name: the middle between the figure's middle and the name, wide enough for both.
    const middle = stars.reduce((sum, p) => sum.add(p), stars[0].clone().multiplyScalar(0)).divideScalar(stars.length)
    const centre = middle.clone().lerp(name, 0.4)
    const radius = Math.max(...stars.map((p) => p.distanceTo(centre)), name.distanceTo(centre)) + MARGIN
    return { centre: centre.toArray(), radius, label: constellationLabelId(c.name) }
  }, [])
  const hit = useMemo(() => ({ geometry: new SphereGeometry(1, 12, 8), material: new MeshBasicMaterial({ visible: false }) }), [])
  useEffect(
    () => () => {
      hit.geometry.dispose()
      hit.material.dispose()
    },
    [hit],
  )
  useEffect(
    () => () => {
      if (sky) mark(sky.label, false)
      canvas.style.cursor = ''
    },
    [sky, canvas],
  )

  if (!sky) return null
  return (
    <mesh
      name="roll-stars"
      geometry={hit.geometry}
      material={hit.material}
      position={sky.centre}
      scale={sky.radius}
      dispose={null}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        canvas.style.cursor = 'pointer'
        mark(sky.label, true)
      }}
      onPointerOut={() => {
        canvas.style.cursor = ''
        mark(sky.label, false)
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (isClick(e.delta)) rollForVisitor()
      }}
    />
  )
}
