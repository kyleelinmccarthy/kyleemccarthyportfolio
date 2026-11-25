import { vi } from 'vitest'
import { createRef } from 'react'
import type { Group } from 'three'
import { Bumblebee } from '@/components/eggs/Bumblebee'
import { triangleCount } from '@/lib/world/kit'
import { drawCalls } from '../world/landmarkChecks'
import { mount } from '../world/r3f'

/** The bumblebee as the bug draws it, batched, and what it draws: shared by its own tests and the planet's totals. */
export async function bumblebee() {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const body = createRef<Group>()
  const wings: [React.RefObject<Group | null>, React.RefObject<Group | null>] = [createRef<Group>(), createRef<Group>()]
  const app = await mount(
    <group name="bug">
      <Bumblebee body={body} wings={wings} />
    </group>,
  )
  const root = app.scene.getObjectByName('bug')!
  root.updateWorldMatrix(true, true)
  const result = { root, body, wings, triangles: triangleCount(root), draws: drawCalls(root), errors: errors.mock.calls.length, unmount: app.unmount }
  errors.mockRestore()
  return result
}
