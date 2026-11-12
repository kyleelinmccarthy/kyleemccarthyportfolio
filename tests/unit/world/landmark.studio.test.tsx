import { describe, it, expect } from 'vitest'
import { BackSide, Box3, type Material, type Mesh, type Object3D } from 'three'
import { MODELS } from '@/components/world/models/registry'
import { lookUniforms } from '@/components/world/lookUniforms'
import { districts, places } from '@/content/world'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('studio')

describe('the studio’s joystick', () => {
  const place = places.find((p) => p.model === 'studio')!
  const district = districts.find((d) => d.id === place.district)!

  /** The studio at `height` with the shared clock at `time`, after a frame: the joystick's swaying groups, its base's foot, and the roof deck under it. */
  async function survey(height: number, time: number) {
    const Studio = MODELS.studio
    const before = lookUniforms.time.value
    lookUniforms.time.value = time
    try {
      const app = await mount(
        <group name="studio">
          <Studio place={{ ...place, height }} district={district} />
        </group>,
      )
      await app.frame()
      const root = app.scene.getObjectByName('studio')!
      root.updateWorldMatrix(true, true)
      const joystick = root.getObjectByName('joystick')!
      const inJoystick = new Set<Object3D>()
      joystick.traverse((o) => inJoystick.add(o))
      const sways: Object3D[] = []
      joystick.traverse((o) => {
        if (o.userData.moving) sways.push(o)
      })
      let foot = Infinity
      let top = -Infinity
      let deck = -Infinity
      const [jx, , jz] = joystick.getWorldPosition(joystick.position.clone()).toArray()
      root.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh || (mesh.material as Material).side === BackSide) return
        const box = new Box3().setFromObject(mesh)
        if (inJoystick.has(mesh)) {
          foot = Math.min(foot, box.min.y)
          top = Math.max(top, box.max.y)
        } else if (box.min.x < jx && box.max.x > jx && box.min.z < jz && box.max.z > jz) {
          // The highest thing under the joystick's middle is the roof deck it stands on.
          deck = Math.max(deck, box.max.y)
        }
      })
      const pose = sways.map((s) => [s.rotation.x, s.rotation.y, s.rotation.z])
      await app.unmount()
      return { sways: sways.length, pose, foot, top, deck }
    } finally {
      lookUniforms.time.value = before
    }
  }

  it.each([[place.height], ...(MODELS.studio.heights ?? []).map((h) => [h])])('at %s tall stands seated on the roof deck, its ball at the place’s height', async (height) => {
    const s = await survey(height, 0)
    // Set into the deck by its seat (4 mm), neither floating over it nor sunk into it.
    expect(s.deck - s.foot).toBeGreaterThan(0)
    expect(s.deck - s.foot).toBeLessThan(0.01)
    expect(s.top).toBeCloseTo(height, 2)
  })

  it('stands upright when the clock is held at its start (reduced motion), and wiggles when it runs', async () => {
    const still = await survey(place.height, 0)
    expect(still.sways).toBe(2)
    for (const angles of still.pose) for (const a of angles) expect(Math.abs(a)).toBeLessThan(1e-9)
    const moving = await survey(place.height, 1.3)
    expect(Math.max(...moving.pose.flat().map(Math.abs))).toBeGreaterThan(0.01)
  })
})
