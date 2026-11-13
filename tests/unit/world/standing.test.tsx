import { describe, it, expect, vi } from 'vitest'
import { Box3, Raycaster, Triangle, Vector3, type Mesh } from 'three'
import { hitRadius } from '@/components/world/Places'
import { MODELS } from '@/components/world/models/registry'
import { guideLook } from '@/content/characters'
import { everyGuest, guestLook } from '@/lib/guests'
import { districts, places } from '@/content/world'
import { FOCUS, MODEL_SCALE } from '@/lib/world/camera'
import { characterHeight, groundUnder, onTheGround, standingFor, type Standing } from '@/lib/world/characters'
import { footprintRadius, withinFootprint } from '@/lib/world/kit'
import { mount } from './r3f'

/** How far a character reaches across the ground from where it stands, its waving arm included: a box this far round its feet. */
const REACH = 0.065

/** The tallest look: the box every character must fit. */
const TALLEST = Math.max(...[guideLook, ...everyGuest().map(guestLook)].map((l) => characterHeight(l)))

/** Every solid triangle of a landmark, in its own frame. */
async function trianglesOf(place: (typeof places)[number]) {
  const district = districts.find((d) => d.id === place.district)!
  const Model = MODELS[place.model]
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const app = await mount(
    <group name="model">
      <Model place={place} district={district} />
    </group>,
  )
  errors.mockRestore()
  const root = app.scene.getObjectByName('model')!
  root.updateWorldMatrix(true, true)
  const tris: Triangle[] = []
  const meshes: Mesh[] = []
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || mesh.userData.light) return
    meshes.push(mesh)
    const p = mesh.geometry.getAttribute('position')
    const index = mesh.geometry.index
    const n = index ? index.count : p.count
    const at = (k: number) => new Vector3().fromBufferAttribute(p, index ? index.getX(k) : k).applyMatrix4(mesh.matrixWorld)
    for (let k = 0; k + 2 < n; k += 3) tris.push(new Triangle(at(k), at(k + 1), at(k + 2)))
  })
  return { tris, meshes, unmount: app.unmount }
}

/** The box a character standing at `s` fills. */
const boxAt = (s: Standing) => new Box3(new Vector3(s.at[0] - REACH, s.at[1] + 0.01, s.at[2] - REACH), new Vector3(s.at[0] + REACH, s.at[1] + TALLEST, s.at[2] + REACH))

describe('where the guide and the visitor’s character stand, at every place', () => {
  it.each(places.map((p) => [p.id, p] as const))('at %s: on the ground, inside the footprint, clear of the landmark, apart, seen from the camera, and the visitor’s character outside the landmark’s hit sphere', async (_, place) => {
    const stand = standingFor(place.id)
    const radius = footprintRadius(place.id, places)
    const { tris, meshes, unmount } = await trianglesOf(place)
    try {
      for (const [who, raw] of Object.entries(stand)) {
        const s = onTheGround(place, districts, raw)
        // On the ground: settled onto it (the planet curves away from a landmark's plane, and the land rises and falls),
        // or standing on the landmark's own floor where its spot says so.
        expect(s.at[1], who).toBeCloseTo(raw.at[1] > 0 ? raw.at[1] : groundUnder(place, districts, s.at[0], s.at[2]), 6)
        expect(Number.isFinite(s.at[1]), who).toBe(true)
        // Inside the footprint, all of the figure.
        for (const dx of [-REACH, REACH]) for (const dz of [-REACH, REACH]) expect(withinFootprint(new Vector3(s.at[0] + dx, 0, s.at[2] + dz), radius), `${who} at ${s.at}`).toBe(true)
        // Clear of every part of the landmark.
        const box = boxAt(s)
        const hit = tris.find((t) => box.intersectsTriangle(t))
        expect(hit ? `${who} meets the landmark at ${hit.a.toArray().map((x) => x.toFixed(2))}` : null).toBeNull()
        // Seen from the place's camera: nothing of the landmark between it and the figure's head.
        const h = place.height * MODEL_SCALE
        const eye = new Vector3(0, (FOCUS.up + FOCUS.upPerHeight * h) / MODEL_SCALE, (FOCUS.back + FOCUS.backPerHeight * h) / MODEL_SCALE)
        const head = new Vector3(s.at[0], s.at[1] + TALLEST * 0.85, s.at[2])
        const ray = new Raycaster(eye, head.clone().sub(eye).normalize(), 0, eye.distanceTo(head))
        expect(ray.intersectObjects(meshes, false).length, `${who}'s head hidden from the camera`).toBe(0)
      }
      // Apart: neither stands in the other.
      expect(Math.hypot(stand.guide.at[0] - stand.guest.at[0], stand.guide.at[2] - stand.guest.at[2])).toBeGreaterThan(REACH * 2.4)
      // The visitor's character, pressed to open the picker, stands outside the sphere that catches a press on the landmark.
      const g = stand.guest.at
      const middle = new Vector3(0, place.height / 2, 0)
      expect(new Vector3(g[0], TALLEST / 2, g[2]).distanceTo(middle)).toBeGreaterThan(hitRadius(place))
    } finally {
      await unmount()
    }
  })
})
