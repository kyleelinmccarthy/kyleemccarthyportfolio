import { describe, it, expect } from 'vitest'
import { BackSide, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { MODELS } from '@/components/world/models/registry'
import { DIE_RADIUS, MAIN } from '@/components/world/models/Mountain'
import { districts, places } from '@/content/world'
import { DIE, SNOW_PEAK } from '@/lib/world/kit'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('mountain')

describe('the mountain’s die and summit', () => {
  const place = places.find((p) => p.model === 'mountain')!
  const district = districts.find((d) => d.id === place.district)!

  /** The mountain at `height`: the main peak's solid vertices, the die's turning foot, and the summit pole's foot. */
  async function survey(height: number) {
    const Mountain = MODELS.mountain
    const app = await mount(
      <group name="mountain">
        <Mountain place={{ ...place, height }} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('mountain')!
    root.updateWorldMatrix(true, true)
    const peak: Vector3[] = []
    root.getObjectByName('main-peak')!.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || (mesh.material as Material).side === BackSide) return
      const position = mesh.geometry.getAttribute('position')
      for (let i = 0; i < position.count; i++) peak.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
    })
    // The die turns in the one group spinning about the upright.
    const spins: Object3D[] = []
    root.traverse((o) => {
      if (o.userData.moving && o.userData.motion === 'y') spins.push(o)
    })
    const die = spins[0].getWorldPosition(new Vector3())
    const pole = root.getObjectByName('summit-pole')!.getWorldPosition(new Vector3())
    await app.unmount()
    return { peak, die, pole, spins: spins.length }
  }

  it.each([[place.height], ...(MODELS.mountain.heights ?? []).map((h) => [h])])('at %s tall: the die, turning, sweeps clear of the main peak’s rock, and the summit pole is set into the tip', async (height) => {
    const { peak, die, pole, spins } = await survey(height)
    expect(spins).toBe(1)
    const top = Math.max(...peak.map((v) => v.y))
    const axis = (v: Vector3) => Math.hypot(v.x - MAIN.at[0], v.z - MAIN.at[1])
    // The peak's true cone: below its snow line (whose corners rise and dip off the cone's rings) no point of its rock
    // stands outside it, so it is a fair stand-in for the rock round the die, far below the snow.
    const cone = (y: number) => MAIN.radius * Math.pow(Math.max(0, 1 - y / top), SNOW_PEAK.curve)
    const rock = peak.filter((v) => v.y < top * (MAIN.snow - 0.1))
    expect(Math.max(...rock.map((v) => v.y))).toBeGreaterThan(die.y + 0.2)
    for (const v of rock) expect(axis(v)).toBeLessThanOrEqual(cone(v.y) + 1e-6)
    // The die rests on a face with its middle `inradius × radius` up; turning, it sweeps the ball of its radius round its
    // middle, between its foot and its top. At every height there, that ball stays outside the cone.
    const tall = 2 * DIE.inradius * DIE_RADIUS
    const mid = die.y + tall / 2
    for (let k = 0; k <= 64; k++) {
      const y = die.y + (tall * k) / 64
      const reach = Math.sqrt(Math.max(0, DIE_RADIUS ** 2 - (y - mid) ** 2))
      expect(axis(die) - reach, `at ${y.toFixed(3)}`).toBeGreaterThan(cone(y))
    }
    // The pole's foot stands below the tip, where the cone is wider than the pole.
    expect(pole.y).toBeLessThan(top)
    expect(cone(pole.y)).toBeGreaterThan(0.009)
  })
})
