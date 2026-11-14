import { vi } from 'vitest'
import { createRef } from 'react'
import type { Group } from 'three'
import { Ladybug } from '@/components/eggs/Ladybug'
import { triangleCount } from '@/lib/world/kit'
import { drawCalls } from '../world/landmarkChecks'
import { mount } from '../world/r3f'

/** The ladybug as the bug draws it, batched, and what it draws: shared by its own tests and the planet's totals. */
export async function ladybug() {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const legs: [React.RefObject<Group | null>, React.RefObject<Group | null>] = [createRef<Group>(), createRef<Group>()]
  const app = await mount(
    <group name="bug">
      <Ladybug legs={legs} />
    </group>,
  )
  const root = app.scene.getObjectByName('bug')!
  root.updateWorldMatrix(true, true)
  const result = { root, legs, triangles: triangleCount(root), draws: drawCalls(root), errors: errors.mock.calls.length, unmount: app.unmount }
  errors.mockRestore()
  return result
}
