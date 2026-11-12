import { describe, it, expect, vi } from 'vitest'
import { Box3, Matrix4, Texture, TextureLoader, Vector3, type Mesh, type Object3D } from 'three'
import { MODELS } from '@/components/world/models/registry'
import { districts, places } from '@/content/world'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('billboard')

describe('the billboard’s poster', () => {
  const place = places.find((p) => p.model === 'billboard')!
  const district = districts.find((d) => d.id === place.district)!

  /**
   * The billboard mounted at `height`: its poster, and the box of every other
   * mesh as seen in the poster's own frame (x across it, y up it, z out of its
   * face), so "in front of the face" means in front as the poster faces.
   */
  async function survey(height: number) {
    const Billboard = MODELS.billboard
    const app = await mount(
      <group name="billboard">
        <Billboard place={{ ...place, height }} district={district} />
      </group>,
    )
    const root = app.scene.getObjectByName('billboard')!
    root.updateWorldMatrix(true, true)
    let poster: Mesh | null = null
    const meshes: Mesh[] = []
    root.traverse((o: Object3D) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      if (mesh.geometry.type === 'PlaneGeometry') poster = mesh
      else meshes.push(mesh)
    })
    const result = { poster: null as Mesh | null, normal: new Vector3(), size: [0, 0], others: [] as Array<{ box: Box3; name: string }> }
    if (poster) {
      const face = poster as Mesh
      result.poster = face
      result.normal.fromBufferAttribute(face.geometry.getAttribute('normal'), 0).transformDirection(face.matrixWorld)
      face.geometry.computeBoundingBox()
      const { min, max } = face.geometry.boundingBox!
      result.size = [max.x - min.x, max.y - min.y]
      const toFace = new Matrix4().copy(face.matrixWorld).invert()
      const v = new Vector3()
      for (const mesh of meshes) {
        const position = mesh.geometry.getAttribute('position')
        const box = new Box3()
        for (let i = 0; i < position.count; i++) box.expandByPoint(v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toFace))
        result.others.push({ box, name: `${mesh.geometry.type} at ${box.min.toArray().map((n) => n.toFixed(2))}` })
      }
    }
    await app.unmount()
    return result
  }

  it('shows the place’s own poster: the picture it loads is `place.poster`', async () => {
    expect(place.poster).toBeTruthy()
    const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture())
    try {
      await survey(place.height)
      expect(load.mock.calls.map(([src]) => src)).toEqual([place.poster])
    } finally {
      load.mockRestore()
    }
  })

  it.each([[place.height], ...(MODELS.billboard.heights ?? []).map((h) => [h])])('at %s tall shows the place’s poster, facing the front, with nothing in front of its face', async (height) => {
    const { poster, normal, size, others } = await survey(height)
    expect(poster, 'the billboard carries its poster').not.toBeNull()
    // It faces +Z, toward the place camera, tipped back a little so it also reads from above: in the world its normal
    // points mostly along +Z and a little up, never down or aside.
    expect(normal.z).toBeGreaterThan(0.9)
    expect(normal.y).toBeGreaterThanOrEqual(0)
    expect(Math.abs(normal.x)).toBeLessThan(1e-6)
    // Seen square on, nothing standing out in front of the face overlaps it.
    const [w, h] = size
    const inFront = others.filter(({ box }) => box.max.z > 1e-4 && box.min.x < w / 2 && box.max.x > -w / 2 && box.min.y < h / 2 && box.max.y > -h / 2)
    expect(inFront.map((o) => o.name)).toEqual([])
  })
})
