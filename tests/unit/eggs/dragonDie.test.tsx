import { describe, it, expect } from 'vitest'
import { Box3, Vector3, type Mesh, type Object3D } from 'three'
import { DRAGON_DRAW_BUDGET, DRAGON_TRIANGLE_BUDGET } from '@/lib/world/dragon'
import { dragonDie } from './dragonDieMount'

/** The world bounds of the drawn, unbatched, unnamed meshes under `root` (its outlines and batches left out). */
function boundsOf(root: Object3D): Box3 {
  const box = new Box3()
  const v = new Vector3()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || mesh.userData.batched || mesh.name || !mesh.geometry.getAttribute('position')) return
    const p = mesh.geometry.getAttribute('position')
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld))
  })
  return box
}

describe('the dragon die', () => {
  it('keeps to its own small budget', async () => {
    const s = await dragonDie()
    try {
      expect(s.errors).toBe(0)
      expect(s.triangles).toBeGreaterThan(0)
      expect(s.triangles).toBeLessThanOrEqual(DRAGON_TRIANGLE_BUDGET)
      expect(s.draws).toBeLessThanOrEqual(DRAGON_DRAW_BUDGET)
    } finally {
      await s.unmount()
    }
  })

  it('is centred, faces +Z, and spans about half a model unit with its wings', async () => {
    const s = await dragonDie()
    try {
      const box = boundsOf(s.root)
      expect(box.max.x - box.min.x).toBeGreaterThan(0.4)
      expect(box.max.x - box.min.x).toBeLessThan(0.65)
      expect(Math.abs(box.min.y + box.max.y) / 2).toBeLessThan(0.06)
      expect(s.wings[0].current).toBeTruthy()
      expect(s.wings[1].current).toBeTruthy()
    } finally {
      await s.unmount()
    }
  })

  it('raises both wings together when each hinge turns its own way', async () => {
    const s = await dragonDie()
    try {
      const [right, left] = s.wings.map((w) => w.current!)
      const tips = () => [boundsOf(right).max.y, boundsOf(left).max.y]
      const [r0, l0] = tips()
      right.rotation.z = 0.5
      left.rotation.z = -0.5
      s.root.updateWorldMatrix(true, true)
      const [r1, l1] = tips()
      expect(r1).toBeGreaterThan(r0)
      expect(l1).toBeGreaterThan(l0)
    } finally {
      await s.unmount()
    }
  })
})
