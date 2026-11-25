import { describe, it, expect } from 'vitest'
import { Box3, Vector3, type Mesh } from 'three'
import { BUG_DRAW_BUDGET, BUG_TRIANGLE_BUDGET } from '@/lib/world/bug'
import { bumblebee } from './bumblebeeMount'

describe('the bumblebee', () => {
  it('keeps to its own small budget: a few thousand triangles and a handful of draws', async () => {
    const s = await bumblebee()
    try {
      expect(s.errors).toBe(0)
      expect(s.triangles).toBeGreaterThan(0)
      expect(s.triangles).toBeLessThanOrEqual(BUG_TRIANGLE_BUDGET)
      expect(s.draws).toBeLessThanOrEqual(BUG_DRAW_BUDGET)
    } finally {
      await s.unmount()
    }
  })

  it('stands on the ground, faces +Z, and is about a third of a model unit long', async () => {
    const s = await bumblebee()
    try {
      const box = new Box3()
      const v = new Vector3()
      s.root.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh || mesh.userData.batched || mesh.name || !mesh.geometry.getAttribute('position')) return
        // Not the contact shadow, which lies a hair over the ground round it.
        if (mesh.renderOrder === 1) return
        const p = mesh.geometry.getAttribute('position')
        for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld))
      })
      expect(box.min.y).toBeGreaterThan(-0.02)
      expect(box.min.y).toBeLessThan(0.02)
      expect(box.max.z - box.min.z).toBeGreaterThan(0.24)
      expect(box.max.z - box.min.z).toBeLessThan(0.45)
      // Its head and feelers are to the front.
      expect(box.max.z).toBeGreaterThan(-box.min.z)
      // Its body is there for the flight to lift, and its two wings for it to beat.
      expect(s.body.current).toBeTruthy()
      expect(s.wings[0].current).toBeTruthy()
      expect(s.wings[1].current).toBeTruthy()
    } finally {
      await s.unmount()
    }
  })
})
