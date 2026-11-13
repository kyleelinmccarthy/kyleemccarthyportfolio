import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { BackSide, Box3, Raycaster, Vector3, type Material, type Mesh, type Object3D } from 'three'

// Nothing here should make a sound: the player is stood in for.
vi.mock('@/lib/sound/player', () => ({ petVoices: { play: vi.fn(), stop: vi.fn() } }))

import { pets } from '@/components/hud/petStore'
import { lookUniforms } from '@/components/world/lookUniforms'
import { House } from '@/components/world/models/House'
import { Batched } from '@/components/world/models/kit'
import { PetPresses } from '@/components/world/PetPresses'
import { Places } from '@/components/world/Places'
import { PET_IDS, PETS_LIVE_AT, pets as petContent, type PetId } from '@/content/pets'
import { districts, places } from '@/content/world'
import { worldAt } from '@/lib/world/characters'
import { DRAW_BUDGET, TRIANGLE_BUDGET, triangleCount } from '@/lib/world/kit'
import { PET_HITS, petMiddle } from '@/lib/world/pets'
import { placeGoal } from '@/lib/world/rig'
import { drawCalls } from './landmarkChecks'
import { mount, settle } from './r3f'

const home = places.find((p) => p.model === PETS_LIVE_AT)!
const district = districts.find((d) => d.id === home.district)!
const elsewhere = places.find((p) => p.model !== PETS_LIVE_AT)!

beforeEach(() => pets.reset())
afterEach(() => {
  lookUniforms.time.value = 0
})

/** The pets' hit shapes as the world mounts them with `placeId` open. */
async function pressesAt(placeId: string | null) {
  const app = await mount(
    <group name="presses">
      <PetPresses places={places} districts={districts} placeId={placeId} reducedMotion={false} />
    </group>,
  )
  const found: Mesh[] = []
  app.scene.traverse((o) => {
    if (o.name.startsWith('pet-hit:')) found.push(o as Mesh)
  })
  return { app, found }
}

describe('the pets’ hit shapes', () => {
  it('are there at the pets’ place while it is open: one round each pet, invisible', async () => {
    const { app, found } = await pressesAt(home.id)
    try {
      expect(found.map((m) => m.name.slice('pet-hit:'.length)).sort()).toEqual([...PET_IDS].sort())
      for (const mesh of found) expect((mesh.material as Material).visible).toBe(false)
    } finally {
      await app.unmount()
    }
  })

  it.each([
    ['over the planet', null],
    ['at another place', elsewhere.id],
  ])('are not there %s: a press on the House opens the place, as on any landmark', async (_, placeId) => {
    const { app, found } = await pressesAt(placeId)
    try {
      expect(found).toEqual([])
    } finally {
      await app.unmount()
    }
  })

  it('each lies round its pet’s body: a little larger, for a finger, but not a field round it', async () => {
    const app = await mount(
      <group name="house">
        <Batched>
          <House place={home} district={district} />
        </Batched>
      </group>,
    )
    try {
      const root = app.scene.getObjectByName('house')!
      root.updateWorldMatrix(true, true)
      for (const id of PET_IDS) {
        const pet = root.getObjectByName(`pet:${id}`)!
        // The pet's body, its parts' own surfaces, in its own frame.
        const toPet = pet.matrixWorld.clone().invert()
        const body = new Box3()
        const v = new Vector3()
        pet.traverse((o: Object3D) => {
          const mesh = o as Mesh
          if (!mesh.isMesh || mesh.userData.batched || (mesh.material as Material).side === BackSide) return
          const p = mesh.geometry.getAttribute('position')
          for (let i = 0; i < p.count; i++) body.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toPet))
        })
        const { middle, radii } = PET_HITS[id]
        const hit = new Box3(new Vector3(...middle).sub(new Vector3(...radii)), new Vector3(...middle).add(new Vector3(...radii)))
        expect(hit.containsPoint(body.getCenter(new Vector3())), id).toBe(true)
        // From the ground to over its head.
        expect(hit.min.y, id).toBeLessThanOrEqual(body.min.y + 0.005)
        expect(hit.max.y, id).toBeGreaterThanOrEqual(body.max.y)
        // Never more than a few hundredths of a unit past its body on any side.
        expect(body.clone().expandByScalar(0.035).containsBox(hit), id).toBe(true)
      }
    } finally {
      await app.unmount()
    }
  })

  it.each(PET_IDS)('a press on the %s, from where the camera lands, reaches it first, through the open landmark’s own hit sphere', async (id) => {
    const app = await mount(
      <group name="world">
        <Places places={places} districts={districts} onVisit={() => undefined} open={home.id} />
        <PetPresses places={places} districts={districts} placeId={home.id} reducedMotion={false} />
      </group>,
    )
    try {
      const root = app.scene.getObjectByName('world')!
      root.updateWorldMatrix(true, true)
      // Everything that takes the pointer: the landmarks' spheres and the pets' shapes (all invisible).
      const takers: Mesh[] = []
      root.traverse((o) => {
        const mesh = o as Mesh
        if (mesh.isMesh && (mesh.material as Material).visible === false) takers.push(mesh)
      })
      const eye = placeGoal(home, districts).position
      const target = worldAt(home, districts, petMiddle(id))
      const ray = new Raycaster(eye, target.clone().sub(eye).normalize())
      const hits = ray.intersectObjects(takers, false)
      expect(hits[0]?.object.name).toBe(`pet-hit:${id}`)
    } finally {
      await app.unmount()
    }
  })
})

describe('a pressed pet', () => {
  it.each(PET_IDS)('the %s moves live while it reacts and is merged again after: at rest the House keeps to its budgets', async (id: PetId) => {
    const app = await mount(
      <group name="house">
        <Batched>
          <House place={home} district={district} />
        </Batched>
      </group>,
    )
    try {
      const root = app.scene.getObjectByName('house')!
      const atRest = drawCalls(root)
      expect(atRest).toBeLessThanOrEqual(DRAW_BUDGET)
      expect(triangleCount(root)).toBeLessThanOrEqual(TRIANGLE_BUDGET)
      const start = lookUniforms.time.value
      pets.press(id, { still: false })
      await settle()
      await app.frame()
      await settle()
      expect(drawCalls(root)).toBeGreaterThan(atRest)
      lookUniforms.time.value = start + petContent[id].move.seconds + 0.1
      await app.frame()
      await settle()
      expect(drawCalls(root)).toBe(atRest)
    } finally {
      await app.unmount()
    }
  })

  it('under reduced motion does not move: the House stays merged', async () => {
    const app = await mount(
      <group name="house">
        <Batched>
          <House place={home} district={district} />
        </Batched>
      </group>,
    )
    try {
      const root = app.scene.getObjectByName('house')!
      const atRest = drawCalls(root)
      pets.press('largeDog', { still: true })
      await settle()
      await app.frame()
      await settle()
      expect(drawCalls(root)).toBe(atRest)
    } finally {
      await app.unmount()
    }
  })
})
