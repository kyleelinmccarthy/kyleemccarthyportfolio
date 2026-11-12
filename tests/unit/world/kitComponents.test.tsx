import { describe, it, expect, vi } from 'vitest'
import { BackSide, Box3, MeshBasicMaterial, Texture, TextureLoader, Vector3, type Material, type Mesh } from 'three'
import { landmark } from '@/content/sky'
import { Flag, Picture, Rod, SnowPeak } from '@/components/world/models/kit'
import type { Vec3 } from '@/lib/world/kit'
import { mount } from './r3f'

const C = landmark.stone

/** The solid meshes (lines left out) the element draws, mounted alone. */
async function solids(element: React.ReactNode): Promise<Mesh[]> {
  const app = await mount(<group name="part">{element}</group>)
  const root = app.scene.getObjectByName('part')!
  root.updateWorldMatrix(true, true)
  const out: Mesh[] = []
  root.traverse((o) => {
    const mesh = o as Mesh
    if (mesh.isMesh && (mesh.material as Material).side !== BackSide) out.push(mesh)
  })
  await app.unmount()
  return out
}

describe('a rod', () => {
  it('runs from one point to the other, as thick as its radius', async () => {
    const from: Vec3 = [0.1, 0.2, -0.1]
    const to: Vec3 = [0.4, 0.6, 0.2]
    const [rod] = await solids(<Rod from={from} to={to} radius={0.02} sides={6} color={C} />)
    const box = new Box3().setFromObject(rod)
    // Its two ends' middles are the two points: the box holds both, and reaches past them by no more than its radius.
    for (const p of [from, to]) expect(box.containsPoint(new Vector3(...p))).toBe(true)
    for (let axis = 0; axis < 3; axis++) {
      expect(box.min.getComponent(axis)).toBeGreaterThanOrEqual(Math.min(from[axis], to[axis]) - 0.02 - 1e-6)
      expect(box.max.getComponent(axis)).toBeLessThanOrEqual(Math.max(from[axis], to[axis]) + 0.02 + 1e-6)
    }
  })

  it('draws nothing for two points in one place, and survives values that are not numbers', async () => {
    expect(await solids(<Rod from={[0.1, 0.1, 0.1]} to={[0.1, 0.1, 0.1]} radius={0.02} color={C} />)).toEqual([])
    const odd: Array<[Vec3, Vec3, number]> = [
      [[NaN, 0, 0], [0, 1, 0], 0.02],
      [[0, 0, 0], [0, Infinity, 0], 0.02],
      [[0, 0, 0], [0, 1, 0], -1],
      [[0, 0, 0], [0, 1, 0], NaN],
    ]
    for (const [from, to, radius] of odd) {
      const meshes = await solids(<Rod from={from} to={to} radius={radius} sides={4} color={C} />)
      for (const mesh of meshes) {
        const position = mesh.geometry.getAttribute('position')
        for (let i = 0; i < position.array.length; i++) expect(Number.isFinite(position.array[i]), `${from} → ${to} r ${radius}`).toBe(true)
      }
    }
  })
})

describe('parts build only what they draw', () => {
  /** Every mesh the element draws, lines too. */
  async function meshes(element: React.ReactNode): Promise<Mesh[]> {
    const app = await mount(<group name="part">{element}</group>)
    const out: Mesh[] = []
    app.scene.getObjectByName('part')!.traverse((o) => {
      if ((o as Mesh).isMesh) out.push(o as Mesh)
    })
    await app.unmount()
    return out
  }

  it('a flag with no emblem has its cloth and line only, and one with an emblem has it too', async () => {
    expect(await meshes(<Flag size={[0.3, 0.2]} color={C} />)).toHaveLength(2)
    const square: Array<[number, number]> = [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]]
    expect(await meshes(<Flag size={[0.3, 0.2]} color={C} emblem={{ pieces: [square], color: landmark.gold }} />)).toHaveLength(3)
  })

  it('a snow peak with no line builds no shell for it', async () => {
    expect(await meshes(<SnowPeak radius={0.5} height={0.8} cap={landmark.offWhite} color={C} outline={false} />)).toHaveLength(2)
    expect(await meshes(<SnowPeak radius={0.5} height={0.8} cap={landmark.offWhite} color={C} />)).toHaveLength(3)
  })
})

describe('a lit picture', () => {
  /** The material a picture shows once its image has arrived. */
  async function shown(lit: boolean): Promise<Material> {
    const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(function (_src, onLoad) {
      const t = new Texture() as Texture<HTMLImageElement>
      onLoad?.(t)
      return t
    })
    try {
      const app = await mount(
        <group name="part">
          <Picture src="/media/art/arcanevi.jpg" size={[0.6, 0.4]} lit={lit} />
        </group>,
      )
      let material: Material | null = null
      app.scene.getObjectByName('part')!.traverse((o) => {
        if ((o as Mesh).isMesh) material = (o as Mesh).material as Material
      })
      await app.unmount()
      return material!
    } finally {
      load.mockRestore()
    }
  }

  it('keeps its own colours a hair dimmed (0.95), so a white texel stays under the bloom', async () => {
    const material = await shown(true)
    expect(material).toBeInstanceOf(MeshBasicMaterial)
    const { r, g, b } = (material as MeshBasicMaterial).color
    for (const c of [r, g, b]) expect(c).toBeCloseTo(0.95, 6)
    expect((material as MeshBasicMaterial).map).not.toBeNull()
  })

  it('takes the light like paint when it is not lit', async () => {
    expect(await shown(false)).not.toBeInstanceOf(MeshBasicMaterial)
  })
})
