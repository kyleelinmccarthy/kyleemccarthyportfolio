import { describe, it, expect } from 'vitest'
import { Box3, Vector3, type Mesh, type Object3D } from 'three'
import { Alley, POSTER } from '@/components/world/models/Alley'
import { RAIN } from '@/lib/world/kit'
import { districts, places } from '@/content/world'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('alley')

describe('the alley’s poster', () => {
  it('stands clear of the rain: seen from the front, no streak falls across its frame', async () => {
    const place = places.find((p) => p.model === 'alley')!
    const district = districts.find((d) => d.id === place.district)!
    const app = await mount(
      <group name="alley">
        <Alley place={place} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('alley')!
    root.updateWorldMatrix(true, true)
    // The rain's column: every streak, wherever it falls (it moves only up and down), and half a streak's width either side.
    const rain = new Box3()
    let picture: Box3 | null = null
    root.traverse((o: Object3D) => {
      if (o.userData.moving && o.userData.motion === 'fall') o.traverse((m) => (m as Mesh).isMesh && rain.expandByObject(m))
      const mesh = o as Mesh
      if (mesh.isMesh && mesh.geometry.type === 'PlaneGeometry') picture = new Box3().setFromObject(mesh)
    })
    expect(rain.isEmpty(), 'the alley rains').toBe(false)
    expect(picture, 'the alley carries its poster').not.toBeNull()
    // The poster's frame stands its width round the picture.
    const frame = picture!.clone().expandByVector(new Vector3(POSTER.frame, POSTER.frame, 0))
    const left = rain.min.x - RAIN.width / 2
    const right = rain.max.x + RAIN.width / 2
    const overlaps = left < frame.max.x && right > frame.min.x && rain.min.y < frame.max.y
    expect(overlaps, `rain x ${left.toFixed(3)}..${right.toFixed(3)}, frame x ${frame.min.x.toFixed(3)}..${frame.max.x.toFixed(3)}`).toBe(false)
    await app.unmount()
  })
})
