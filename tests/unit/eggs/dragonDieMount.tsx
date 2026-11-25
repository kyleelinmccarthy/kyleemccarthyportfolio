import { vi } from 'vitest'
import { createRef } from 'react'
import type { Group } from 'three'
import { DragonDie } from '@/components/eggs/DragonDie'
import { triangleCount } from '@/lib/world/kit'
import { drawCalls } from '../world/landmarkChecks'
import { mount } from '../world/r3f'

/** The dragon die as its flight draws it, batched, and what it draws: shared by its own tests and the planet's totals. */
export async function dragonDie() {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const wings: [React.RefObject<Group | null>, React.RefObject<Group | null>] = [createRef<Group>(), createRef<Group>()]
  const app = await mount(
    <group name="dragon">
      <DragonDie wings={wings} />
    </group>,
  )
  const root = app.scene.getObjectByName('dragon')!
  root.updateWorldMatrix(true, true)
  const result = { root, wings, triangles: triangleCount(root), draws: drawCalls(root), errors: errors.mock.calls.length, unmount: app.unmount }
  errors.mockRestore()
  return result
}
