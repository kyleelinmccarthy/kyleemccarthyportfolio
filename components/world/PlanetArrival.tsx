'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Mesh, Object3D } from 'three'
import { arrival } from '@/components/hud/arrivalStore'
import { planetScale, planetTurn } from '@/lib/arrival'
import { testHooksOn } from '@/lib/world/quality'

/** The test hook `window.__worldMeshesDrawn` is set only in an e2e build; see `testHooksOn`. */
const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E)

/** How many meshes in `root` would be drawn: each shown, with everything above it shown. */
function meshesDrawn(root: Object3D): number {
  let count = 0
  const visit = (object: Object3D) => {
    if (!object.visible) return
    if ((object as Mesh).isMesh) count++
    for (const child of object.children) visit(child)
  }
  visit(root)
  return count
}

/**
 * The planet and everything that stands on it, spinning in while the
 * arrival plays: not drawn until its time, then growing from small as it
 * turns into the visitor's view, a little past its size and back
 * (`planetScale`, `planetTurn`, on the arrival's clock). When the arrival is
 * not playing (skipped, over, a deep link, reduced motion) it is simply
 * there. It is one group: at rest it is left alone, and it never adds a draw call.
 */
export function PlanetArrival({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  const resting = useRef(false)
  const scene = useThree((state) => state.scene)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const ms = arrival.elapsed(performance.now())
    if (ms === Number.POSITIVE_INFINITY) {
      if (resting.current) return
      resting.current = true
      g.visible = true
      g.scale.setScalar(1)
      g.rotation.y = 0
      return
    }
    resting.current = false
    const scale = planetScale(ms)
    // Not drawn until it comes in (never scaled to nothing, which no matrix can undo).
    g.visible = scale > 0
    if (scale > 0) {
      g.scale.setScalar(scale)
      g.rotation.y = planetTurn(ms)
    }
  })

  // A test hook: how many meshes the world would draw now, to show the arrival leaves nothing extra behind.
  useLayoutEffect(() => {
    if (!TEST_HOOKS) return
    window.__worldMeshesDrawn = () => meshesDrawn(scene)
    return () => {
      delete window.__worldMeshesDrawn
    }
  }, [scene])

  return <group ref={group}>{children}</group>
}
