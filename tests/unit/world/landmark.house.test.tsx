import { describe, it, expect } from 'vitest'
import { BackSide, Box3, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { House, STONE_HEIGHT } from '@/components/world/models/House'
import { Batched } from '@/components/world/models/kit'
import { districts, places } from '@/content/world'
import { OUTLINE } from '@/lib/world/kit'
import { describeLandmark } from './landmarkChecks'
import { mount } from './r3f'

describeLandmark('house')

/** The owner's five pets, by the names their groups carry (`pet:<name>`), and what each rests on: the ground, or the senior cat's stepping stone. */
const PETS = { largeDog: 0, mediumDog: 0, maskCat: STONE_HEIGHT, swirlCat: 0, kitten: 0 } as const
type Pet = keyof typeof PETS

/** The large dog stands at least this much taller than the medium dog… */
const LARGE_OVER_MEDIUM_HEIGHT = 1.25
/** …and takes at least this much more room, by bounding volume: clearly the bigger animal, not only the taller. */
const LARGE_OVER_MEDIUM_BULK = 1.6
/** Each adult cat stands at least this much taller than the kitten. */
const CAT_OVER_KITTEN_HEIGHT = 1.4
/** How far a pet's lowest point may sit below what it rests on (bedded in, as a rock is, by up to a line's width) or above it (resting, not floating). */
const BEDDED = OUTLINE.part
const RESTING = 0.002

/** The box round a pet's own surfaces: its parts, not their outline shells (which stand a line's width outside them). */
function bodyBox(pet: Object3D): Box3 {
  const box = new Box3()
  pet.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || mesh.userData.batched || (mesh.material as Material).side === BackSide) return
    box.expandByObject(mesh)
  })
  return box
}

describe('the house’s pets', () => {
  it('keeps all five, each resting on the ground or its stone, and their sizes in order: the large dog, the medium dog, each adult cat, the kitten', async () => {
    const place = places.find((p) => p.model === 'house')!
    const district = districts.find((d) => d.id === place.district)!
    const app = await mount(
      <group name="house">
        <Batched>
          <House place={place} district={district} />
        </Batched>
      </group>,
    )
    try {
      const root = app.scene.getObjectByName('house')!
      root.updateWorldMatrix(true, true)
      const found = new Map<string, Object3D>()
      root.traverse((o) => {
        if (o.name.startsWith('pet:')) found.set(o.name.slice(4), o)
      })
      expect([...found.keys()].sort()).toEqual(Object.keys(PETS).sort())
      const box = Object.fromEntries([...found].map(([name, pet]) => [name, bodyBox(pet)])) as Record<Pet, Box3>
      const size = (p: Pet) => box[p].getSize(new Vector3())
      const height = (p: Pet) => size(p).y
      const bulk = (p: Pet) => size(p).x * size(p).y * size(p).z
      const sizes = (Object.keys(PETS) as Pet[]).map((p) => `${p} ${height(p).toFixed(3)} tall, ${bulk(p).toFixed(5)} room`).join('; ')

      for (const [pet, rest] of Object.entries(PETS) as Array<[Pet, number]>) {
        expect(box[pet].min.y, `${pet}'s lowest point against what it rests on (${rest})`).toBeGreaterThanOrEqual(rest - BEDDED)
        expect(box[pet].min.y, `${pet}'s lowest point against what it rests on (${rest})`).toBeLessThanOrEqual(rest + RESTING)
      }
      expect(height('largeDog'), sizes).toBeGreaterThanOrEqual(height('mediumDog') * LARGE_OVER_MEDIUM_HEIGHT)
      expect(bulk('largeDog'), sizes).toBeGreaterThanOrEqual(bulk('mediumDog') * LARGE_OVER_MEDIUM_BULK)
      for (const cat of ['maskCat', 'swirlCat'] as const) {
        expect(height('mediumDog'), sizes).toBeGreaterThan(height(cat))
        expect(height(cat), sizes).toBeGreaterThanOrEqual(height('kitten') * CAT_OVER_KITTEN_HEIGHT)
      }
    } finally {
      await app.unmount()
    }
  })
})
