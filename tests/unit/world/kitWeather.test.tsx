import { describe, it, expect, vi } from 'vitest'
import { Vector3, type Mesh, type Object3D } from 'three'
import { Rain, Weather } from '@/components/world/models/kit'
import type { Place } from '@/content/types'
import { mount } from './r3f'

/** What is drawn under `root`: its meshes, and whether some group in it says it falls (rain). */
function drawn(root: Object3D) {
  const meshes: Mesh[] = []
  let falls = false
  root.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh)
    if (o.userData.moving && o.userData.motion === 'fall') falls = true
  })
  return { meshes, falls }
}

async function weather(kind: Place['weather'], rot?: [number, number, number]) {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const app = await mount(
    <group name="w">
      <Weather kind={kind} at={[0, 1.5, 0]} rot={rot} size={[1, 0.4, 0.6]} fall={1.5} />
    </group>,
  )
  const root = app.scene.getObjectByName('w')!
  root.updateWorldMatrix(true, true)
  const out = { ...drawn(root), errors: errors.mock.calls.length, root }
  errors.mockRestore()
  return { out, unmount: () => app.unmount() }
}

describe('weather, from a place’s field', () => {
  it('draws nothing for a place with no weather', async () => {
    const { out, unmount } = await weather(undefined)
    expect(out.meshes).toHaveLength(0)
    expect(out.falls).toBe(false)
    await unmount()
  })

  it('draws a cloud and rain falling from it for rain', async () => {
    const { out, unmount } = await weather('rain')
    expect(out.falls).toBe(true)
    // The cloud and the rain.
    expect(out.meshes.length).toBe(2)
    expect(out.errors).toBe(0)
    await unmount()
  })

  it('draws nothing, and does not throw, for a kind it does not know', async () => {
    const { out, unmount } = await weather('snow' as unknown as Place['weather'])
    expect(out.meshes).toHaveLength(0)
    expect(out.errors).toBe(0)
    await unmount()
  })

  it('takes the turn it is given', async () => {
    const { out, unmount } = await weather('rain', [0, Math.PI / 2, 0])
    // The cloud is wider (x) than deep (z); turned a quarter, its width runs along z.
    const cloud = out.meshes.find((m) => !m.userData.moving && m.geometry.getAttribute('position').count > 100)!
    cloud.geometry.computeBoundingBox()
    const box = cloud.geometry.boundingBox!.clone().applyMatrix4(cloud.matrixWorld)
    expect(box.max.z - box.min.z).toBeGreaterThan(box.max.x - box.min.x)
    await unmount()
  })
})

describe('rain on screen', () => {
  it('is culled like any part, by a bounding sphere that holds its whole column wherever its streaks have fallen to', async () => {
    const app = await mount(
      <group name="r">
        <Rain at={[0, 2, 0]} radius={0.4} fall={1.6} />
      </group>,
    )
    const mesh = drawn(app.scene.getObjectByName('r')!).meshes[0]
    expect(mesh.frustumCulled).toBe(true)
    const sphere = mesh.geometry.boundingSphere!
    expect(sphere).toBeTruthy()
    // The column runs from its top (0) to its foot (-1.6), 0.4 round: every corner of it is inside the sphere.
    for (const y of [0, -1.6]) for (const [x, z] of [[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]]) expect(sphere.containsPoint(new Vector3(x, y, z))).toBe(true)
    await app.unmount()
  })
})
