import { describe, it, expect } from 'vitest'
import { BackSide, Box3, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { MODELS } from '@/components/world/models/registry'
import { districts, places } from '@/content/world'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('postbox')

describe('the postbox’s square', () => {
  const place = places.find((p) => p.model === 'postbox')!
  const district = districts.find((d) => d.id === place.district)!

  it('carries everything that stands on the ground: no leg or foot overhangs the paving', async () => {
    const Postbox = MODELS.postbox
    const app = await mount(
      <group name="postbox">
        <Postbox place={place} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('postbox')!
    root.updateWorldMatrix(true, true)
    // Each solid mesh's box (its line left out); the paving, the widest thing on the ground; and all that stands on it.
    const boxes: Box3[] = []
    root.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.isMesh && (mesh.material as Material).side !== BackSide) boxes.push(new Box3().setFromObject(mesh))
    })
    const paving = boxes.filter((b) => b.min.y < 0.005).reduce((a, b) => (b.max.x - b.min.x > a.max.x - a.min.x ? b : a))
    const grounded = boxes.filter((b) => b.min.y < paving.max.y + 0.01)
    const overhanging = grounded.filter((b) => b !== paving && (b.min.x < paving.min.x || b.max.x > paving.max.x || b.min.z < paving.min.z || b.max.z > paving.max.z))
    expect(overhanging.map((b) => b.min.toArray().map((n) => n.toFixed(2)).join(','))).toEqual([])
    await app.unmount()
  })
})

describe('the postbox’s letter', () => {
  const place = places.find((p) => p.model === 'postbox')!
  const district = districts.find((d) => d.id === place.district)!

  it.each([[place.height], ...(MODELS.postbox.heights ?? []).map((h) => [h])])('at %s tall hovers over everything else and bobs', async (height) => {
    const Postbox = MODELS.postbox
    const app = await mount(
      <group name="postbox">
        <Postbox place={{ ...place, height }} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('postbox')!
    root.updateWorldMatrix(true, true)
    const bobs: Object3D[] = []
    root.traverse((o) => {
      if (o.userData.moving && o.userData.motion === 'bob') bobs.push(o)
    })
    // One bobbing letter, and nothing else moves.
    expect(bobs).toHaveLength(1)
    const inLetter = new Set<Object3D>()
    bobs[0].traverse((o) => inLetter.add(o))
    const v = new Vector3()
    let letterLow = Infinity
    let restHigh = -Infinity
    let moving = 0
    root.traverse((o) => {
      const mesh = o as Mesh
      if (o !== bobs[0] && o.userData.moving) moving++
      if (!mesh.isMesh) return
      const position = mesh.geometry.getAttribute('position')
      for (let i = 0; i < position.count; i++) {
        const y = v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).y
        if (inLetter.has(mesh)) letterLow = Math.min(letterLow, y)
        else restHigh = Math.max(restHigh, y)
      }
    })
    expect(moving).toBe(0)
    // Its lowest point, at the bottom of its bob, stays clear of the box's cap below it.
    const reach = Number(bobs[0].userData.reach)
    expect(reach).toBeGreaterThan(0)
    expect(letterLow - reach).toBeGreaterThan(restHigh)
    await app.unmount()
  })
})
