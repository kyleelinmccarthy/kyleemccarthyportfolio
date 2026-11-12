import { describe, it, expect } from 'vitest'
import { Vector3, type Mesh } from 'three'
import { GenericModel } from '@/components/world/models/GenericModel'
import { districts, places } from '@/content/world'
import { angleDeg, dirOf } from '@/lib/world/geo'
import { FOOTPRINT, footprintRadius } from '@/lib/world/kit'
import { mount } from './r3f'

/** The smallest radius any place allows its landmark. */
const smallest = Math.min(...places.map((p) => footprintRadius(p.id, places)))

describe('room for every landmark', () => {
  it('keeps places at least 9 degrees apart, so two placed too close fail here rather than quietly getting tiny footprints', () => {
    for (const a of places) for (const b of places) if (a !== b) expect(angleDeg(dirOf(a.at), dirOf(b.at)), `${a.id}–${b.id}`).toBeGreaterThan(9)
  })

  it('never allows a landmark less than 1.0 model units round', () => {
    expect(smallest).toBeGreaterThanOrEqual(1.0)
  })
})

describe('the generic building', () => {
  /** How far the building reaches across the ground and how high, from its real geometry as react-three-fiber builds it. */
  async function reach(height: number) {
    const place = { ...places[0], height }
    const district = districts.find((d) => d.id === place.district)!
    const app = await mount(
      <group name="model">
        <GenericModel place={place} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('model')!
    root.updateWorldMatrix(true, true)
    const v = new Vector3()
    let across = 0
    let top = -Infinity
    let bottom = Infinity
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || mesh.userData.batched) return
      const position = mesh.geometry.getAttribute('position')
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
        across = Math.max(across, Math.hypot(v.x, v.z))
        top = Math.max(top, v.y)
        bottom = Math.min(bottom, v.y)
      }
    })
    await app.unmount()
    return { across, top, bottom }
  }

  const heights = places.map((p) => p.height)
  for (const [label, height] of [['shortest', Math.min(...heights)], ['tallest', Math.max(...heights)]] as const) {
    it(`fits inside the smallest allowed footprint and under 2.6, at the ${label} place's height (${height})`, async () => {
      const { across, top, bottom } = await reach(height)
      expect(across).toBeLessThanOrEqual(smallest)
      expect(top).toBeLessThanOrEqual(FOOTPRINT.height)
      expect(bottom).toBeGreaterThanOrEqual(-1e-6)
      // It is as tall as its place says, give or take its chimney.
      expect(top).toBeGreaterThanOrEqual(height)
    })
  }
})
